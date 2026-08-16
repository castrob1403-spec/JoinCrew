create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  university text not null,
  career text not null,
  subjects text[] not null default '{}',
  availability text not null,
  study_preference text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Authenticated users can view profiles"
on public.profiles for select
to authenticated
using (true);

create policy "Students can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id, full_name, university, career, subjects, availability, study_preference
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'university', ''),
    coalesce(new.raw_user_meta_data ->> 'career', ''),
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'subjects')), '{}'),
    coalesce(new.raw_user_meta_data ->> 'availability', ''),
    coalesce(new.raw_user_meta_data ->> 'study_preference', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
