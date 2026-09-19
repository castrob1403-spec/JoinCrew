-- Ejecuta este archivo una vez en Supabase > SQL Editor.
-- Permite recibir contactos públicos y deja su lectura solo al administrador.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 5 and 255),
  subject text not null check (char_length(trim(subject)) between 2 and 120),
  message text not null check (char_length(trim(message)) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);
alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can send a contact message" on public.contact_messages;
create policy "Anyone can send a contact message"
on public.contact_messages for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can manage contact messages" on public.contact_messages;
create policy "Admins can manage contact messages"
on public.contact_messages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant insert on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;
-- Campos usados por el administrador al responder.
alter table public.contact_messages
  add column if not exists admin_reply text check (admin_reply is null or char_length(trim(admin_reply)) between 1 and 2000),
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references auth.users(id) on delete set null;
-- La Netlify Function usa service_role para obtener de forma segura el destinatario
-- y registrar la respuesta después de enviar el correo.
grant select, update on public.contact_messages to service_role;