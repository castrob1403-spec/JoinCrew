-- Ejecuta este archivo una vez después de platform-management.sql.
-- Bandeja persistente de notificaciones y gestión segura por administración.
alter table public.admin_notifications
  add column if not exists expires_at timestamptz not null default 'infinity'::timestamptz,
  add column if not exists hidden_at timestamptz;

-- Los avisos existentes y nuevos permanecen en la bandeja hasta que el admin los elimine.
alter table public.admin_notifications alter column expires_at set default 'infinity'::timestamptz;
update public.admin_notifications set expires_at = 'infinity'::timestamptz;

create index if not exists admin_notifications_recipient_created_idx
  on public.admin_notifications(recipient_id, created_at desc);

drop policy if exists "Recipients can read their admin messages" on public.admin_notifications;
drop policy if exists "Recipients can read active admin messages" on public.admin_notifications;
create policy "Recipients can read their admin messages"
on public.admin_notifications for select to authenticated
using (recipient_id = (select auth.uid()));

drop policy if exists "Admins can read admin messages" on public.admin_notifications;
create policy "Admins can read admin messages"
on public.admin_notifications for select to authenticated
using (public.is_admin());

create or replace function public.mark_my_admin_notifications_read()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.admin_notifications
  set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
end;
$$;

create or replace function public.delete_admin_notification(notification_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  delete from public.admin_notifications where id = notification_id;
end;
$$;

revoke all on function public.mark_my_admin_notifications_read() from public;
revoke all on function public.delete_admin_notification(uuid) from public;
grant execute on function public.mark_my_admin_notifications_read() to authenticated;
grant execute on function public.delete_admin_notification(uuid) to authenticated;

-- La Function de Netlify conserva permisos de servidor si se reutiliza en el futuro.
grant select, update on public.admin_notifications to service_role;