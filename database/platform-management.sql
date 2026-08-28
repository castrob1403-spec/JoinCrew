-- =========================================================
-- STUDYCIRCLE: planes, salas en vivo y administración
-- Ejecutar UNA VEZ después de social-features.sql y group-management.sql
-- en Supabase > SQL Editor.
-- =========================================================

alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan in ('free', 'premium'));
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check check (account_status in ('active', 'banned'));

alter table public.study_groups drop constraint if exists study_groups_max_members_check;
alter table public.study_groups add constraint study_groups_max_members_check check (max_members between 2 and 999);

-- Mantiene los campos sensibles (rol, plan y estado) fuera de las ediciones del estudiante.
drop policy if exists "Students can update their own profile" on public.profiles;
revoke update on public.profiles from authenticated;
create or replace function public.update_my_profile(
  p_full_name text, p_university text, p_career text, p_subjects text[],
  p_availability text, p_study_preference text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles set
    full_name = p_full_name, university = p_university, career = p_career,
    subjects = coalesce(p_subjects, '{}'), availability = p_availability,
    study_preference = p_study_preference
  where id = auth.uid() and account_status = 'active';
end;
$$;
revoke all on function public.update_my_profile(text, text, text, text[], text, text) from public;
grant execute on function public.update_my_profile(text, text, text, text[], text, text) to authenticated;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.set_student_account(
  target_user_id uuid, new_status text, new_plan text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if new_status not in ('active', 'banned') or new_plan not in ('free', 'premium') then
    raise exception 'Invalid account settings';
  end if;
  update public.profiles set account_status = new_status, plan = new_plan
  where id = target_user_id and role = 'user';
end;
$$;
revoke all on function public.set_student_account(uuid, text, text) from public;
grant execute on function public.set_student_account(uuid, text, text) to authenticated;

-- Grupos gratis: máximo 5 personas. Premium puede usar hasta 999 (ilimitado en la práctica).
create or replace function public.create_study_group(
  group_name text, group_description text, group_subject text,
  group_modality text default 'En línea', group_max_members integer default 5
)
returns public.study_groups language plpgsql security definer set search_path = public as $$
declare new_group public.study_groups; current_plan text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select plan into current_plan from public.profiles where id = auth.uid() and account_status = 'active';
  if current_plan is null then raise exception 'Your account cannot create groups'; end if;
  if current_plan = 'free' and (group_max_members < 2 or group_max_members > 5) then
    raise exception 'El plan gratis permite grupos de 2 a 5 integrantes';
  end if;
  if current_plan = 'premium' and (group_max_members < 2 or group_max_members > 999) then
    raise exception 'La capacidad debe estar entre 2 y 999';
  end if;
  insert into public.study_groups (name, description, subject, modality, max_members, created_by)
  values (group_name, coalesce(group_description, ''), group_subject, group_modality, group_max_members, auth.uid())
  returning * into new_group;
  insert into public.group_members (group_id, user_id, member_role) values (new_group.id, auth.uid(), 'leader');
  return new_group;
end;
$$;

create table if not exists public.study_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  description text not null default '' check (char_length(description) <= 500),
  group_id uuid references public.study_groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  is_public boolean not null default true,
  max_participants integer not null default 5 check (max_participants between 2 and 999),
  status text not null default 'live' check (status in ('live', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists study_rooms_status_created_idx on public.study_rooms(status, created_at desc);
alter table public.study_rooms enable row level security;

create policy "Anyone can see live public rooms" on public.study_rooms for select to authenticated
using ((is_public and status = 'live') or created_by = (select auth.uid()) or (group_id is not null and public.is_group_member(group_id)) or public.is_admin());
create policy "Admins can manage rooms" on public.study_rooms for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create or replace function public.create_study_room(
  room_name text, room_description text, target_group_id uuid,
  room_is_public boolean default true, room_max_participants integer default 5
)
returns public.study_rooms language plpgsql security definer set search_path = public as $$
declare new_room public.study_rooms; current_plan text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select plan into current_plan from public.profiles where id = auth.uid() and account_status = 'active';
  if current_plan is null then raise exception 'Your account cannot create rooms'; end if;
  if target_group_id is not null and not exists (
    select 1 from public.study_groups where id = target_group_id and created_by = auth.uid()
  ) then raise exception 'Only the group leader can create its room'; end if;
  if current_plan = 'free' and (not room_is_public or room_max_participants > 5) then
    raise exception 'Las salas privadas y de más de 5 personas son Premium';
  end if;
  insert into public.study_rooms (name, description, group_id, created_by, is_public, max_participants)
  values (room_name, coalesce(room_description, ''), target_group_id, auth.uid(), room_is_public, room_max_participants)
  returning * into new_room;
  return new_room;
end;
$$;
revoke all on function public.create_study_room(text, text, uuid, boolean, integer) from public;
grant execute on function public.create_study_room(text, text, uuid, boolean, integer) to authenticated;

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists admin_notifications_recipient_idx on public.admin_notifications(recipient_id, created_at desc);
alter table public.admin_notifications enable row level security;
create policy "Recipients can read their admin messages" on public.admin_notifications for select to authenticated
using (recipient_id = (select auth.uid()));
create policy "Admins can send notifications" on public.admin_notifications for insert to authenticated
with check (sender_id = (select auth.uid()) and public.is_admin());
grant select, insert on public.admin_notifications to authenticated;

-- El panel puede ver actividad sin exponerla a estudiantes comunes.
create policy "Admins can see all groups" on public.study_groups for select to authenticated using (public.is_admin());
create policy "Admins can see all group members" on public.group_members for select to authenticated using (public.is_admin());

alter publication supabase_realtime add table public.study_groups;
alter publication supabase_realtime add table public.study_rooms;
