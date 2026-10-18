-- 2025-10-18-reconcile-live-schema.sql — bring the live project up to what the code queries.
--
-- Why this exists: the live project (zfawbwkgzdxfeqdsbtap) is an OLDER version of the schema
-- than server/models expects, read from its own PostgREST introspection
-- (GET $SUPABASE_URL/rest/v1/ -> .definitions). The differences that actually break requests:
--
--   users                lacks `googleid`  -> User.findById('-password') selects it, so every
--                                            GET /api/auth/me throws 42703 (500) and the client
--                                            treats the session as expired; User.save() inserts
--                                            it, so registration and admin create-user fail too.
--   overwatch_accounts   lacks rank, mainheroes, lastused, sharingstatus, createdat, updatedat
--                        -> roster metadata renders empty and date sorting is inert.
--   admin_audit_logs     missing           -> adminAuditLogger.persist, GET /api/admin/logs and
--                                            the dashboard's flagged-activity count all fail.
--   email_services       missing           -> server/models/EmailService queries it. (The live
--                                            `email_service` table is a different, per-user
--                                            verified-email feature: left untouched.)
--   system_settings      is the key/value store the code needs (id, key, value, createdat,
--                        updatedat) and already holds rows, while the live `settings` table is
--                        per-user preferences (id, user_id, preferences, created_at). The app
--                        now points Settings at system_settings; this file only seeds the two
--                        keys it reads. The `settings` table is NOT touched.
--
-- Every statement is additive and idempotent: no DROP, no DELETE, no UPDATE of existing rows.
-- Apply with the project's database password:
--   psql "postgresql://postgres:<password>@db.zfawbwkgzdxfeqdsbtap.supabase.co:5432/postgres" \
--     -f server/migrations/2025-10-18-reconcile-live-schema.sql
-- or paste it into the Supabase SQL editor.

-- users --------------------------------------------------------------------
alter table users add column if not exists googleid text;

-- overwatch_accounts -------------------------------------------------------
alter table overwatch_accounts
    add column if not exists rank text,
    add column if not exists mainheroes text[],
    add column if not exists lastused timestamptz,
    add column if not exists sharingstatus text,
    add column if not exists createdat timestamptz default now(),
    add column if not exists updatedat timestamptz default now();

-- Admin audit trail (shape from 0001_baseline.sql) --------------------------
create table if not exists admin_audit_logs (
    id uuid primary key default uuid_generate_v4(),
    action text not null,
    adminid text,
    details jsonb,
    createdat timestamptz default now()
);
create index if not exists idx_admin_audit_logs_createdat on admin_audit_logs(createdat desc);

-- Email services (shape from 0001_baseline.sql; distinct from live email_service)
create table if not exists email_services (
    id uuid primary key default uuid_generate_v4(),
    email text unique not null,
    clientid text,
    clientsecret text,
    isactive boolean default true,
    createdat timestamptz default now(),
    updatedat timestamptz default now()
);

-- Settings the code reads, in the key/value store it now points at ----------
insert into system_settings (key, value) values
    ('allow_registration', 'true'::jsonb),
    ('min_jwt_issued_at', '0'::jsonb)
on conflict (key) do nothing;
