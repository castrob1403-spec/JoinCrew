-- Ejecuta este archivo una vez después de platform-management.sql.
-- Notificaciones con vigencia, bandeja del estudiante y administración segura.
alter table public.admin_notifications
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days'),
  add column if not exists hidden_at timestamptz;

update public.admin_notifications
set expires_at = created_at + interval '7 days'
where expires_at is null;

create index if not exists admin_notifications_recipient_active_idx
  on public.admin_notifications(recipient_id, expires_at desc);

drop policy if exists "Recipients can read their admin messages" on public.admin_notifications;
create policy "Recipients can read active admin messages"
on public.admin_notifications for select to authenticated
using (recipient_id = (select auth.uid()) and expires_at > now());

drop policy if exists "Admins can read admin messages" on public.admin_notifications;
create policy "Admins can read admin messages"
on public.admin_notifications for select to authenticated
using (public.is_admin());

create or replace function public.hide_my_admin_notification(notification_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.admin_notifications
  set hidden_at = now(), read_at = coalesce(read_at, now())
  where id = notification_id and recipient_id = auth.uid() and expires_at > now();
end;
$$;

create or replace function public.restore_my_admin_notification(notification_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.admin_notifications
  set hidden_at = null
  where id = notification_id and recipient_id = auth.uid() and expires_at > now();
end;
$$;

create or replace function public.delete_admin_notification(notification_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  delete from public.admin_notifications where id = notification_id;
end;
$$;

revoke all on function public.hide_my_admin_notification(uuid) from public;
revoke all on function public.restore_my_admin_notification(uuid) from public;
revoke all on function public.delete_admin_notification(uuid) from public;
grant execute on function public.hide_my_admin_notification(uuid) to authenticated;
grant execute on function public.restore_my_admin_notification(uuid) to authenticated;
grant execute on function public.delete_admin_notification(uuid) to authenticated;