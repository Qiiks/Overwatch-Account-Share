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
`user_google_accounts`, `system_settings` (the key/value store the app reads; the live project's
`settings` table is per-user preferences and is unused), `admin_audit_logs`, `email_services`.
The authoritative schema for a fresh project is `server/migrations/0001_baseline.sql` (verify
column names against the live project's PostgREST OpenAPI document before rebuilding anything
from it). An existing project is brought forward with `server/migrations/2025-10-18-reconcile-live-schema.sql`,
which carries only the missing columns and tables and touches no existing row — note the live
`email_service` table (per-user verified email) is a different feature from `email_services`.

## Security model

- Account credentials are encrypted with AES-256-GCM; the API only decrypts them for the owner or a
  user the account is shared with — everyone else sees cipher text.
- `ENCRYPTION_SECRET` is hashed once with sha256 to form the key (no salt, no stretching), so it must be
  a high-entropy random string of at least 32 characters, not a passphrase. The ciphertext format
  (`iv:tag:ct`) carries no key id: changing the secret makes every stored credential undecryptable, so a
  rotation requires a decrypt-and-re-encrypt pass first.
- Sessions are httpOnly cookies; JavaScript never holds a token. `NODE_ENV=production` is required in
  production — it is what sets the cookie's `Secure` flag (the server refuses to boot without `NODE_ENV`).
- `app.set('trust proxy', 1)` assumes exactly one proxy hop in front of the API (Traefik on Coolify).
  Rate limits and audit IPs key off `req.ip`; adding a CDN in front makes that one hop two and every
  user shares a bucket — update the value when the topology changes. Never trust the leftmost `XFF`.
- CSRF: double-submit cookie validated against the `x-csrf-token` header, with a strict origin
  allowlist on non-GET requests.
- OTP messages are pushed over an authenticated socket to the owner and the users the account is
  shared with — never broadcast. Suspending a user or forcing a logout also drops their live sockets.
- Rate limits: per-route limits on auth (plus a per origin+account failure counter), credential reads
  and the account browse list.
- The OTP relay's health is exposed at `GET /health` under `services.otpRelay`. Only a real Google
  rejection (400/401) parks a mailbox, and the app then shows it as "reconnect required"; a token
  that fails to *decrypt* means `ENCRYPTION_SECRET` does not match the key the mailbox was linked
  with, so it is logged loudly and nothing is written — the grants stay intact, fix the key.

## Testing

```bash
npm run test:e2e        # Playwright (e2e/) against a running client+server pair
```

The suite starts both processes itself unless they are already up, and the admin cases need
`ADMIN_EMAIL`/`ADMIN_PASSWORD` (they self-skip otherwise, which reads as green without them).
Set `PW_CHROMIUM_PATH=/usr/bin/brave` to drive a Chromium already installed on the host instead of
Playwright's bundled build — useful where the download cannot unpack, and the same engine either way.

Run it from a **clean environment**: the webServer commands inherit your shell, and a sourced
`server/.env` exports `PORT=5001`, which makes `next dev` try to bind the API's port and die
(`listen EADDRINUSE`, reported as "Process from config.webServer exited early"). Seed inside a
subshell — `( set -a; . server/.env; set +a; … )` — and keep the exports away from the test run.

Two flake sources worth knowing before debugging a red run against the live database: a second
run inside the same minute 429s the credentials round-trip (shared per-IP budget of 5/min on
`/all-public` and `/:id/credentials`), and Supabase can answer a transient 503 that fails the
create assertion. Neither is a code defect — restart the API or wait out the window, and re-run.

## Deployment

CI (`.github/workflows/deploy.yml`) builds both images, pushes them to GHCR (tagged `latest` and
`:sha-<commit>` for rollback), and updates the `deploy` branch, which Coolify watches.

**Topology: one host.** `.coolify-prebuilt.yml` serves the app and the API from the same domain —
Traefik routes `Host(<domain>) && (PathPrefix('/api') || PathPrefix('/socket.io'))` to the server
container (priority 10) and everything else to the client. The client's
`NEXT_PUBLIC_API_BASE_URL` is the relative `/api`, so the browser stays same-origin and the
`SameSite=Lax` session cookie is sent.

- Set the app domain in Coolify and make sure the server service carries the higher-priority
  routers above; verify with `curl -i https://<domain>/api/health` (a 404 there means something
  stripped the `/api` prefix — do not use Coolify's per-resource "Path" field for that reason).
- Fallback if path routing is unavailable: put the API on a sibling subdomain
  (`api.<domain>`) of the same registrable domain, keep `COOKIE_SAMESITE=lax` (siblings are
  same-site), and rebuild the client with an absolute `NEXT_PUBLIC_API_BASE_URL=https://api.<domain>`
  — one rebuild per environment.
- Server env: every variable in `server/.env.example` must be set in Coolify, including
  `NODE_ENV=production` (the server refuses to boot without it, and it is what sets the session
  cookie's `Secure` flag) and `ALLOWED_ORIGINS=https://<domain>`.
- Client build args: `NEXT_PUBLIC_API_BASE_URL=/api` and `NEXT_PUBLIC_WEBSITE_URL=https://<domain>`
  (the only two the client reads; both are baked at image build time).
- Health: the client container probes its own `/api/health` (liveness); point an external check at
  the API's `/ready` for a real dependency signal.
