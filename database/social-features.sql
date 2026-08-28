-- =========================================================
-- STUDYCIRCLE: grupos, chat privado y sesiones de estudio
-- Ejecutar una vez en Supabase > SQL Editor
-- =========================================================

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  description text not null default '' check (char_length(description) <= 500),
  subject text not null,
  modality text not null default 'En línea',
  max_members integer not null default 6 check (max_members between 2 and 30),
  is_public boolean not null default true,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  user_one uuid not null references auth.users(id) on delete cascade,
  user_two uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_one <> user_two),
  unique (user_one, user_two)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.study_groups(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 500),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  modality text not null default 'En línea',
  meeting_url text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists group_members_user_id_idx on public.group_members(user_id);
create index if not exists group_messages_group_created_idx on public.group_messages(group_id, created_at);
create index if not exists direct_messages_conversation_created_idx on public.direct_messages(conversation_id, created_at);
create index if not exists study_sessions_creator_starts_idx on public.study_sessions(created_by, starts_at);
create index if not exists study_sessions_group_starts_idx on public.study_sessions(group_id, starts_at);

alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.study_sessions enable row level security;

-- Helpers: used only by policies/RPCs. They always require a signed-in user.
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.group_members
      where group_id = target_group_id and user_id = auth.uid()
    );
$$;

create or replace function public.is_direct_participant(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.direct_conversations
      where id = target_conversation_id
        and auth.uid() in (user_one, user_two)
    );
$$;

revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.is_direct_participant(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_direct_participant(uuid) to authenticated;

-- RPC: creates a group and inserts its creator as the owner atomically.
create or replace function public.create_study_group(
  group_name text,
  group_description text,
  group_subject text,
  group_modality text default 'En línea',
  group_max_members integer default 6
)
returns public.study_groups
language plpgsql
security definer
set search_path = public
as $$
declare new_group public.study_groups;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  insert into public.study_groups (name, description, subject, modality, max_members, created_by)
  values (group_name, coalesce(group_description, ''), group_subject, group_modality, group_max_members, auth.uid())
  returning * into new_group;

  insert into public.group_members (group_id, user_id, member_role)
  values (new_group.id, auth.uid(), 'owner');

  return new_group;
end;
$$;

-- RPC: joins a public group without exceeding its capacity.
create or replace function public.join_study_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare capacity integer;
declare member_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select max_members into capacity from public.study_groups
  where id = target_group_id and is_public = true;
  if capacity is null then raise exception 'Group unavailable'; end if;

  if exists (select 1 from public.group_members where group_id = target_group_id and user_id = auth.uid()) then
    return;
  end if;

  select count(*) into member_count from public.group_members where group_id = target_group_id;
  if member_count >= capacity then raise exception 'This group is full'; end if;

  insert into public.group_members (group_id, user_id) values (target_group_id, auth.uid());
end;
$$;

-- RPC: returns an existing direct conversation or creates one for two students.
create or replace function public.get_or_create_direct_conversation(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare first_user uuid;
declare second_user uuid;
declare conversation_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if auth.uid() = target_user_id then raise exception 'You cannot message yourself'; end if;
  if not exists (select 1 from public.profiles where id = target_user_id and role = 'user') then
    raise exception 'Student unavailable';
  end if;

  if auth.uid()::text < target_user_id::text then
    first_user := auth.uid(); second_user := target_user_id;
  else
    first_user := target_user_id; second_user := auth.uid();
  end if;

  insert into public.direct_conversations (user_one, user_two)
  values (first_user, second_user)
  on conflict (user_one, user_two) do update set user_one = excluded.user_one
  returning id into conversation_id;

  return conversation_id;
end;
$$;

revoke all on function public.create_study_group(text, text, text, text, integer) from public;
revoke all on function public.join_study_group(uuid) from public;
revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.create_study_group(text, text, text, text, integer) to authenticated;
grant execute on function public.join_study_group(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

create policy "Students can see public groups or their groups"
on public.study_groups for select to authenticated
using (is_public or (select public.is_group_member(id)));

create policy "Students can update groups they own"
on public.study_groups for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "Students can delete groups they own"
on public.study_groups for delete to authenticated
using (created_by = (select auth.uid()));

create policy "Members can see the members of their groups"
on public.group_members for select to authenticated
using ((select public.is_group_member(group_id)));

create policy "Members can leave a group"
on public.group_members for delete to authenticated
using (user_id = (select auth.uid()) and member_role = 'member');

create policy "Members can read their group messages"
on public.group_messages for select to authenticated
using ((select public.is_group_member(group_id)));

create policy "Members can post group messages"
on public.group_messages for insert to authenticated
with check (sender_id = (select auth.uid()) and (select public.is_group_member(group_id)));

create policy "Students can see their direct conversations"
on public.direct_conversations for select to authenticated
using ((select auth.uid()) in (user_one, user_two));

create policy "Students can read messages in their conversations"
on public.direct_messages for select to authenticated
using ((select public.is_direct_participant(conversation_id)));

create policy "Students can send direct messages in their conversations"
on public.direct_messages for insert to authenticated
with check (sender_id = (select auth.uid()) and (select public.is_direct_participant(conversation_id)));

create policy "Students can read their sessions and group sessions"
on public.study_sessions for select to authenticated
using (created_by = (select auth.uid()) or (group_id is not null and (select public.is_group_member(group_id))));

create policy "Students can create their own sessions"
on public.study_sessions for insert to authenticated
with check (created_by = (select auth.uid()) and (group_id is null or (select public.is_group_member(group_id))));

create policy "Students can update their own sessions"
on public.study_sessions for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()) and (group_id is null or (select public.is_group_member(group_id))));

create policy "Students can delete their own sessions"
on public.study_sessions for delete to authenticated
using (created_by = (select auth.uid()));

grant select, update, delete on public.study_groups to authenticated;
grant select, delete on public.group_members to authenticated;
grant select, insert on public.group_messages to authenticated;
grant select on public.direct_conversations to authenticated;
grant select, insert on public.direct_messages to authenticated;
grant select, insert, update, delete on public.study_sessions to authenticated;

-- Realtime: enable it for actual updates in chat and groups.
alter publication supabase_realtime add table public.group_messages;
alter publication supabase_realtime add table public.direct_messages;

-- Quick verification after execution:
-- select table_name from information_schema.tables where table_schema = 'public'
-- and table_name in ('study_groups', 'group_members', 'group_messages', 'direct_conversations', 'direct_messages', 'study_sessions');
