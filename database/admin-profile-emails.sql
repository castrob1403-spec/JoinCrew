-- Ejecuta este archivo una vez en Supabase > SQL Editor.
-- Expone los correos de estudiantes exclusivamente al panel admin.
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
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    p.id, p.full_name, u.email, p.university, p.career, p.subjects,
    p.availability, p.study_preference, p.created_at, p.role, p.plan, p.account_status
  from public.profiles p
  join auth.users u on u.id = p.id
  where coalesce(p.role, 'user') <> 'admin'
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_profiles_with_email() from public;
grant execute on function public.admin_profiles_with_email() to authenticated;
-- Actualiza la caché de la API para que el panel detecte la función de inmediato.
NOTIFY pgrst, 'reload schema';
