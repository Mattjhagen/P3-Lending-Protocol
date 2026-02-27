# Supabase SQL Editor commands: encrypted portal PIN lock values

Use these SQL snippets in the Supabase SQL Editor to store portal PIN lock hashes encrypted at rest in `public.user_portal_pin_lock_secure`.

> `pin_hash` should be the already-hashed value produced by the app (`sha256:...`), not the raw PIN.

---

## 1) Upsert one user's encrypted PIN lock values

Replace each placeholder before running:

- `<USER_ID_UUID>`
- `<PIN_HASH_SHA256>`
- `<PIN_LENGTH>` (`4` to `6`)
- `<INACTIVITY_MINUTES>` (`5`, `10`, `15`, `30`, or `60`)
- `<ENABLED_BOOL>` (`true` / `false`)
- `<PORTAL_PIN_KEK_SECRET>`

```sql
insert into public.user_portal_pin_lock_secure (
  user_id,
  pin_hash_ciphertext,
  pin_length,
  inactivity_minutes,
  enabled
)
values (
  '<USER_ID_UUID>'::uuid,
  pgp_sym_encrypt(
    '<PIN_HASH_SHA256>',
    '<PORTAL_PIN_KEK_SECRET>',
    'cipher-algo=aes256, compress-algo=1'
  ),
  <PIN_LENGTH>,
  <INACTIVITY_MINUTES>,
  <ENABLED_BOOL>
)
on conflict (user_id) do update
set
  pin_hash_ciphertext = excluded.pin_hash_ciphertext,
  pin_length = excluded.pin_length,
  inactivity_minutes = excluded.inactivity_minutes,
  enabled = excluded.enabled,
  updated_at = now();
```

---

## 2) Verify decrypt for one row (sanity check)

```sql
select
  user_id,
  convert_from(
    pgp_sym_decrypt(pin_hash_ciphertext, '<PORTAL_PIN_KEK_SECRET>'),
    'utf8'
  ) as decrypted_pin_hash,
  pin_length,
  inactivity_minutes,
  enabled,
  updated_at
from public.user_portal_pin_lock_secure
where user_id = '<USER_ID_UUID>'::uuid;
```

---

## 3) Backfill encrypted values from `public.users.data` JSONB

This migrates existing `data.portalPinLock.pinHash` values into the secure table.

```sql
insert into public.user_portal_pin_lock_secure (
  user_id,
  pin_hash_ciphertext,
  pin_length,
  inactivity_minutes,
  enabled
)
select
  u.id,
  pgp_sym_encrypt(
    (u.data -> 'portalPinLock' ->> 'pinHash'),
    '<PORTAL_PIN_KEK_SECRET>',
    'cipher-algo=aes256, compress-algo=1'
  ),
  greatest(
    4,
    least(6, coalesce(nullif((u.data -> 'portalPinLock' ->> 'pinLength'), '')::int, 4))
  )::smallint,
  case
    when coalesce((u.data -> 'portalPinLock' ->> 'inactivityMinutes')::int, 10) in (5, 10, 15, 30, 60)
      then (u.data -> 'portalPinLock' ->> 'inactivityMinutes')::int
    else 10
  end::smallint,
  coalesce((u.data -> 'portalPinLock' ->> 'enabled')::boolean, false)
from public.users u
where coalesce(u.data -> 'portalPinLock' ->> 'pinHash', '') <> ''
on conflict (user_id) do update
set
  pin_hash_ciphertext = excluded.pin_hash_ciphertext,
  pin_length = excluded.pin_length,
  inactivity_minutes = excluded.inactivity_minutes,
  enabled = excluded.enabled,
  updated_at = now();
```

---

## 4) Optional cleanup after backfill

If you are fully migrating to secure storage, clear plaintext hashes from JSONB:

```sql
update public.users
set data = jsonb_set(
  data,
  '{portalPinLock,pinHash}',
  '""'::jsonb,
  true
)
where coalesce(data -> 'portalPinLock' ->> 'pinHash', '') <> '';
```
