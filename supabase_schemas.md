CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    isAdmin BOOLEAN DEFAULT FALSE,
    isApproved BOOLEAN DEFAULT TRUE,
    googleId TEXT UNIQUE,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE overwatch_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accountTag TEXT UNIQUE NOT NULL,
    accountEmail TEXT NOT NULL,
    accountPassword TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    rank TEXT,
    mainHeroes TEXT[],
    lastUsed TIMESTAMPTZ,
    sharingStatus TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE overwatch_account_allowed_users (
    overwatch_account_id UUID NOT NULL REFERENCES overwatch_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (overwatch_account_id, user_id)
);

CREATE TABLE email_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serviceName TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);