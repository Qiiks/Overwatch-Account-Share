-- 0001_baseline.sql — schema for a fresh Supabase project.
--
-- The live project's schema is authoritative: this file reconstructs the tables the
-- code in server/models actually queries (snake_case / lowercase columns). Verify it
-- against the live project before rebuilding anything from it:
--   curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY" | jq '.definitions | keys'
-- Every statement is idempotent.

create extension if not exists "uuid-ossp";

-- Users ---------------------------------------------------------------------
create table if not exists users (
    id uuid primary key default uuid_generate_v4(),
    username text unique not null,
    email text unique not null,
    password_hash text not null,
    role text default 'user',
    isadmin boolean default false,
    isapproved boolean default true,
    googleid text,
    createdat timestamptz default now(),
    updatedat timestamptz default now()
);

-- Overwatch accounts --------------------------------------------------------
create table if not exists overwatch_accounts (
    id uuid primary key default uuid_generate_v4(),
    -- accounttag/accountpassword hold AES-256-GCM ciphertext (see utils/encryption.js)
    accounttag text not null,
    accountemail text not null,
    accountpassword text not null,
    normalized_account_email text,
    password_encryption_type text default 'aes',
    linked_google_account_id uuid,
    otp text,
    otp_fetched_at timestamptz,
    otp_expires_at timestamptz,
    rank text,
    mainheroes text[],
    lastused timestamptz,
    status text,
    sharingstatus text,
    owner_id uuid references users(id) on delete cascade,
    createdat timestamptz default now(),
    updatedat timestamptz default now()
);
create index if not exists idx_overwatch_accounts_owner on overwatch_accounts(owner_id);
create index if not exists idx_overwatch_accounts_normalized_email
    on overwatch_accounts(normalized_account_email);

-- Sharing (junction) --------------------------------------------------------
create table if not exists overwatch_account_allowed_users (
    overwatch_account_id uuid not null references overwatch_accounts(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    createdat timestamptz default now(),
    primary key (overwatch_account_id, user_id)
);

-- Linked Google mailboxes for OTP fetching ----------------------------------
-- NOTE: the code has two write paths that disagree (display_name vs account_name);
-- keep both columns until the live schema is confirmed.
create table if not exists user_google_accounts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references users(id) on delete cascade,
    email text not null,
    display_name text,
    account_name text,
    refresh_token text,
    access_token text,
    token_expiry timestamptz,
    scopes text,
    is_primary boolean default false,
    is_active boolean default true,
    last_used timestamptz,
    last_otp_fetch timestamptz,
    otp_fetch_count integer default 0,
    createdat timestamptz default now(),
    updatedat timestamptz default now()
);
create index if not exists idx_user_google_accounts_user on user_google_accounts(user_id);

-- Mailbox credentials used for OTP fetching (OAuth client per mailbox) -------
create table if not exists email_services (
    id uuid primary key default uuid_generate_v4(),
    email text unique not null,
    clientid text,
    clientsecret text,
    isactive boolean default true,
    createdat timestamptz default now(),
    updatedat timestamptz default now()
);

-- Settings (key/value) ------------------------------------------------------
create table if not exists settings (
    id uuid primary key default uuid_generate_v4(),
    key text unique not null,
    value jsonb,
    createdat timestamptz default now(),
    updatedat timestamptz default now()
);
create index if not exists idx_settings_key on settings(key);

insert into settings (key, value) values
    ('allow_registration', 'true'::jsonb),
    ('require_email_verification', 'false'::jsonb),
    ('max_accounts_per_user', '10'::jsonb),
    ('maintenance_mode', 'false'::jsonb),
    ('min_jwt_issued_at', '0'::jsonb)
on conflict (key) do nothing;
