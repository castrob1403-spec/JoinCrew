-- =========================================================
-- STUDYCIRCLE: llamadas privadas entre dos estudiantes
-- Ejecutar una vez en Supabase > SQL Editor.
-- Estas llamadas NO se almacenan en study_rooms y nunca aparecen
-- en el listado de salas públicas.
-- =========================================================

create table if not exists public.direct_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  started_by uuid not null references auth.users(id) on delete cascade,
  call_type text not null default 'video' check (call_type in ('audio', 'video')),
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 minutes'),
  ended_at timestamptz
);

create index if not exists direct_calls_conversation_active_idx
  on public.direct_calls(conversation_id, status, expires_at desc);

alter table public.direct_calls enable row level security;

create policy "Participants can see their direct calls"
on public.direct_calls for select to authenticated
using (public.is_direct_participant(conversation_id));

create or replace function public.start_direct_call(
  target_conversation_id uuid,
  requested_call_type text default 'video'
)
returns public.direct_calls
language plpgsql
security definer
set search_path = public
as $$
declare active_call public.direct_calls;
begin
  if auth.uid() is null or not public.is_direct_participant(target_conversation_id) then
    raise exception 'You are not part of this conversation';
  end if;
  if requested_call_type not in ('audio', 'video') then
    raise exception 'Invalid call type';
  end if;

  select * into active_call from public.direct_calls
  where conversation_id = target_conversation_id
    and status = 'active'
    and expires_at > now()
  order by created_at desc limit 1;

  if active_call.id is not null then return active_call; end if;

  insert into public.direct_calls (conversation_id, started_by, call_type)
  values (target_conversation_id, auth.uid(), requested_call_type)
  returning * into active_call;
  return active_call;
end;
$$;

create or replace function public.end_direct_call(target_call_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.direct_calls set status = 'ended', ended_at = now()
  where id = target_call_id
    and status = 'active'
    and public.is_direct_participant(conversation_id);
end;
$$;

revoke all on function public.start_direct_call(uuid, text) from public;
revoke all on function public.end_direct_call(uuid) from public;
grant execute on function public.start_direct_call(uuid, text) to authenticated;
grant execute on function public.end_direct_call(uuid) to authenticated;
grant select on public.direct_calls to authenticated;
grant select on public.direct_calls, public.direct_conversations to service_role;

alter publication supabase_realtime add table public.direct_calls;
