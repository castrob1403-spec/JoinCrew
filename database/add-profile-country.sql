-- Ejecuta este archivo una sola vez en Supabase > SQL Editor.
-- Añade el país a los perfiles existentes y futuros.
alter table public.profiles
  add column if not exists country text not null default 'No especificado';

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
  return new;
end;
$$;
-- Completa solamente los perfiles de estudiantes creados antes de este cambio.
-- La cuenta administradora no se modifica.
update public.profiles
set country = 'Ecuador'
where role = 'user'
  and (country is null or country = 'No especificado');