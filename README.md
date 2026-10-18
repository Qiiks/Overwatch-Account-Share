# Overwatch Account Share

A community tool for sharing Overwatch/Blizzard accounts safely: owners add accounts, share them with
specific users, and the app relays Battle.net login codes (OTP) in real time from a linked Gmail
mailbox instead of handing over mailbox access.

## Stack

- **Client**: Next.js 14 (App Router) + TypeScript + Tailwind CSS v4 (CSS-first tokens) + shadcn/ui
  primitives, Socket.IO client. Package manager: npm.
- **Server**: Node 20 + Express 4 + Socket.IO, Supabase (PostgreSQL/PostgREST) via
  `@supabase/supabase-js`. Package manager: npm.
- **Auth**: JWT in an httpOnly cookie; CSRF via double-submit cookie + `x-csrf-token`, plus an
  Origin allowlist on state-changing requests.
- **Secrets at rest**: AES-256-GCM (key derived from `ENCRYPTION_SECRET`).

## Repository layout

```
├── client/         Next.js app (app/, components/, context/, lib/)
├── server/         Express API (routes/, controllers/, models/, services/, middleware/, utils/)
├── e2e/            Playwright specs
├── docker-compose.yml        Local production-like compose
└── .coolify-prebuilt.yml     Coolify deployment (prebuilt GHCR images)
```

## Local development

```bash
npm run install-all     # installs root, server and client dependencies
npm start               # server :5001 + client :3000 (concurrently)
```

Client `.env.local` (the base URL already includes the API prefix; helpers append bare paths such as
`/auth/me`):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
```

Server `.env` (see `server/.env.example` for the full list):

```bash
NODE_ENV=development
PORT=5001
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
ENCRYPTION_SECRET=...        # changing this makes existing stored credentials undecryptable
OAUTH_STATE_SECRET=...
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5001/api/google-auth/otp/callback
```

The server refuses to boot when a required variable is missing, and the client's API base URL must
point at the server origin. Create the first admin:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm --prefix server run setup-admin
```

## Database

Supabase (PostgreSQL). Tables: `users`, `overwatch_accounts`, `overwatch_account_allowed_users`,
`user_google_accounts`, `email_services`, `settings`. Schema reference: `supabase_schemas.md`;
`server/migrations/0001_baseline.sql` builds the schema on a fresh project.

## Security model

- Account credentials are encrypted with AES-256-GCM; the API only decrypts them for the owner or a
  user the account is shared with — everyone else sees cipher text.
- Sessions are httpOnly cookies; JavaScript never holds a token.
- CSRF: double-submit cookie validated against the `x-csrf-token` header, with a strict origin
  allowlist on non-GET requests.
- OTP messages are pushed over an authenticated socket to the owner and the users the account is
  shared with — never broadcast.
- Rate limits: per-route limits on auth, credential reads, admin operations and the account browse list.

## Testing

```bash
npm run test:e2e        # Playwright (e2e/) against a running client+server pair
```

## Deployment

CI (`.github/workflows/deploy.yml`) builds both images, pushes them to GHCR, and updates the `deploy`
branch, which Coolify watches; `.coolify-prebuilt.yml` describes the Coolify stack (client on `/`,
API on `/api` + `/socket.io`). Set every server variable above in the Coolify environment, and set the
three `NEXT_PUBLIC_*` values as build args/secrets so they are baked into the client bundle.
