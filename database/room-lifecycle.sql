-- =========================================================
-- STUDYCIRCLE: finalizar salas públicas
-- Ejecutar una vez en Supabase > SQL Editor.
-- =========================================================

alter table public.study_rooms add column if not exists ended_at timestamptz;

create or replace function public.end_study_room(target_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  update public.study_rooms
  set status = 'closed', ended_at = now()
  where id = target_room_id
    and status = 'live'
    and created_by = auth.uid();

  if not found then
    raise exception 'Only the creator can end this room';
  end if;
end;
$$;

revoke all on function public.end_study_room(uuid) from public;
grant execute on function public.end_study_room(uuid) to authenticated;
