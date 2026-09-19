-- JOINCREW: correos privados para administración.
-- Ejecuta este archivo UNA vez en Supabase > SQL Editor.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.user_emails (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  updated_at timestamptz not null default now()
);
alter table private.user_emails enable row level security;
revoke all on private.user_emails from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.user_emails to service_role;

-- Copia los correos de las cuentas que ya existen.
insert into private.user_emails (user_id, email, updated_at)
select id, email, now()
from auth.users
where email is not null
on conflict (user_id) do update
set email = excluded.email, updated_at = now();

-- Mantiene profiles para los datos de estudio y private.user_emails para el correo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id, full_name, university, country, career, subjects, availability, study_preference
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'university', ''),
    coalesce(new.raw_user_meta_data ->> 'country', 'No especificado'),
    coalesce(new.raw_user_meta_data ->> 'career', ''),
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'subjects')), '{}'),
    coalesce(new.raw_user_meta_data ->> 'availability', ''),
    coalesce(new.raw_user_meta_data ->> 'study_preference', '')
  );

  if new.email is not null then
    insert into private.user_emails (user_id, email, updated_at)
    values (new.id, new.email, now())
    on conflict (user_id) do update
    set email = excluded.email, updated_at = now();
  end if;
  return new;
end;
$$;

-- Esta es la única puerta de acceso a correos: exige una sesión administradora.
create or replace function public.admin_profiles_with_email()
returns table (
  id uuid,
  full_name text,
  email text,
  university text,
  career text,
  subjects text[],
  availability text,
  study_preference text,
  created_at timestamptz,
  role text,
  plan text,
  account_status text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    profile.id, profile.full_name, private_email.email, profile.university,
    profile.career, profile.subjects, profile.availability,
    profile.study_preference, profile.created_at, profile.role,
    profile.plan, profile.account_status
  from public.profiles as profile
  left join private.user_emails as private_email on private_email.user_id = profile.id
  where coalesce(profile.role, 'user') <> 'admin'
  order by profile.created_at desc;
end;
$$;

revoke all on function public.admin_profiles_with_email() from public;
grant execute on function public.admin_profiles_with_email() to authenticated;
notify pgrst, 'reload schema';