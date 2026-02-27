-- Encrypted portal inactivity PIN lock storage.
-- Keeps the PIN hash encrypted at rest using pgcrypto.

create extension if not exists "pgcrypto";

create table if not exists public.user_portal_pin_lock_secure (
  user_id uuid primary key references public.users(id) on delete cascade,
  pin_hash_ciphertext bytea not null,
  pin_length smallint not null check (pin_length between 4 and 6),
  inactivity_minutes smallint not null default 10 check (inactivity_minutes in (5, 10, 15, 30, 60)),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_portal_pin_lock_secure_updated_at
  on public.user_portal_pin_lock_secure (updated_at desc);

drop trigger if exists update_user_portal_pin_lock_secure_updated_at on public.user_portal_pin_lock_secure;
create trigger update_user_portal_pin_lock_secure_updated_at
before update on public.user_portal_pin_lock_secure
for each row execute procedure public.update_updated_at_column();

alter table public.user_portal_pin_lock_secure enable row level security;

drop policy if exists "portal_pin_lock_secure_select_self_or_admin" on public.user_portal_pin_lock_secure;
create policy "portal_pin_lock_secure_select_self_or_admin"
on public.user_portal_pin_lock_secure
for select
using (auth.uid() = user_id or public.current_is_admin() or auth.role() = 'service_role');

drop policy if exists "portal_pin_lock_secure_insert_self_or_admin" on public.user_portal_pin_lock_secure;
create policy "portal_pin_lock_secure_insert_self_or_admin"
on public.user_portal_pin_lock_secure
for insert
with check (auth.uid() = user_id or public.current_is_admin() or auth.role() = 'service_role');

drop policy if exists "portal_pin_lock_secure_update_self_or_admin" on public.user_portal_pin_lock_secure;
create policy "portal_pin_lock_secure_update_self_or_admin"
on public.user_portal_pin_lock_secure
for update
using (auth.uid() = user_id or public.current_is_admin() or auth.role() = 'service_role')
with check (auth.uid() = user_id or public.current_is_admin() or auth.role() = 'service_role');

drop policy if exists "portal_pin_lock_secure_delete_admin_or_service" on public.user_portal_pin_lock_secure;
create policy "portal_pin_lock_secure_delete_admin_or_service"
on public.user_portal_pin_lock_secure
for delete
using (public.current_is_admin() or auth.role() = 'service_role');
