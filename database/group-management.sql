-- =========================================================
-- STUDYCIRCLE: administración, detalles y chat multimedia
-- Ejecutar después de social-features.sql
-- =========================================================

-- Normaliza los roles que existían antes y permite moderadores.
alter table public.group_members drop constraint if exists group_members_member_role_check;
update public.group_members set member_role = 'leader' where member_role = 'owner';
alter table public.group_members add constraint group_members_member_role_check
check (member_role in ('leader', 'moderator', 'member'));

-- Los grupos nuevos se crean con su autor como líder.
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
  values (new_group.id, auth.uid(), 'leader');

  return new_group;
end;
$$;

-- Permite ver los integrantes de grupos públicos antes de unirse.
drop policy if exists "Members can see the members of their groups" on public.group_members;
create policy "Students can view public group members"
on public.group_members for select to authenticated
using (
  (select public.is_group_member(group_id))
  or exists (
    select 1 from public.study_groups
    where id = group_id and is_public = true
  )
);

-- Solo el creador puede asignar el rol de moderador o miembro.
create or replace function public.set_group_member_role(
  target_group_id uuid,
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.study_groups
    where id = target_group_id and created_by = auth.uid()
  ) then raise exception 'Only the group leader can change roles'; end if;
  if target_user_id = auth.uid() then raise exception 'The leader role cannot be reassigned'; end if;
  if new_role not in ('moderator', 'member') then raise exception 'Invalid role'; end if;

  update public.group_members
  set member_role = new_role
  where group_id = target_group_id and user_id = target_user_id;

  if not found then raise exception 'Member not found'; end if;
end;
$$;

-- Solo el creador puede retirar a otro integrante.
create or replace function public.remove_group_member(
  target_group_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_user_id = auth.uid() then raise exception 'The leader cannot be removed'; end if;
  if not exists (
    select 1 from public.study_groups
    where id = target_group_id and created_by = auth.uid()
  ) then raise exception 'Only the group leader can remove members'; end if;

  delete from public.group_members
  where group_id = target_group_id and user_id = target_user_id;
end;
$$;

revoke all on function public.set_group_member_role(uuid, uuid, text) from public;
revoke all on function public.remove_group_member(uuid, uuid) from public;
grant execute on function public.set_group_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

-- Archivos privados del chat. La ruta siempre será: <id-del-grupo>/<nombre>.
insert into storage.buckets (id, name, public)
values ('group-chat-media', 'group-chat-media', false)
on conflict (id) do update set public = false;

create or replace function public.can_access_group_media(object_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare target_group_id uuid;
begin
  if auth.uid() is null then return false; end if;
  begin
    target_group_id := split_part(object_name, '/', 1)::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.is_group_member(target_group_id);
end;
$$;

revoke all on function public.can_access_group_media(text) from public;
grant execute on function public.can_access_group_media(text) to authenticated;

drop policy if exists "Group members can read media" on storage.objects;
drop policy if exists "Group members can upload media" on storage.objects;
drop policy if exists "Uploaders can delete their media" on storage.objects;

create policy "Group members can read media"
on storage.objects for select to authenticated
using (bucket_id = 'group-chat-media' and public.can_access_group_media(name));

create policy "Group members can upload media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'group-chat-media'
  -- En algunos proyectos de Supabase storage.objects.owner_id se guarda como texto.
  -- auth.uid() es UUID, por eso lo convertimos antes de comparar.
  and owner_id = (select auth.uid()::text)
  and public.can_access_group_media(name)
);

create policy "Uploaders can delete their media"
on storage.objects for delete to authenticated
using (bucket_id = 'group-chat-media' and owner_id = (select auth.uid()::text));

-- Las filas de mensajes guardan la URL/ruta del archivo adjunto opcional.
alter table public.group_messages add column if not exists media_path text;
alter table public.group_messages add constraint group_messages_content_or_media_check
check (char_length(trim(content)) between 1 and 1000 or media_path is not null);

create policy "Authors can delete their group messages"
on public.group_messages for delete to authenticated
using (sender_id = (select auth.uid()));

grant delete on public.group_messages to authenticated;
