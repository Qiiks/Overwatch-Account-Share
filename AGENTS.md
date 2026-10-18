# AGENTS.md — Overwatch Account Share

## Project

Community tool for sharing Overwatch/Blizzard accounts: owners add accounts, share them with specific
users, and the app relays Battle.net login codes (OTP) in real time from a linked Gmail mailbox.

- **Client**: Next.js 14 App Router + TypeScript + Tailwind CSS v4 (CSS-first tokens, no
  `tailwind.config.*`) + shadcn/ui primitives + Socket.IO client. Package manager: **npm**.
- **Server**: Node 20 + Express 4 + Socket.IO + Supabase (PostgreSQL via PostgREST, no ORM).
  Package manager: **npm**.
- **Auth**: JWT in an httpOnly cookie + CSRF double-submit (`csrf-token` cookie, `x-csrf-token`
  header) + origin allowlist on non-GET. No tokens in `localStorage`.
- **Encryption at rest**: AES-256-GCM with a key derived from `ENCRYPTION_SECRET`.

## Layout

```
client/     Next.js app — app/ (routes), components/ (ui/ primitives), context/, lib/api.ts
server/     Express API — server.js, routes/, controllers/, models/, services/, middleware/, utils/,
            migrations/ (SQL), scripts/ (admin bootstrap, seed, audits)
e2e/        Playwright end-to-end specs
docker-compose.yml / .coolify-prebuilt.yml / .github/workflows/deploy.yml   deployment
```

## Commands

```bash
npm run install-all      # root + server + client
npm start                # server :5001, client :3000
npm --prefix client run build     # production build (type errors are NOT ignored)
npm run test:e2e                  # Playwright
npm --prefix server run setup-admin   # first admin (ADMIN_EMAIL/ADMIN_PASSWORD)
```

## Conventions

- **API responses**: `{ success: true, data, meta? }` on success; errors are
  `{ success: false, error: { message, code, details? } }` (thrown as `ApiError`, normalised by
  `server/middleware/errorMiddleware.js`). Health probes (`/health`, `/ready`, `/api/health`) are the
  only bare responses.
- **Database**: lowercase columns, camelCase in API responses. Table `settings` holds
  `allow_registration` and `min_jwt_issued_at`. `models/` are thin PostgREST wrappers.
- **Client data access**: only through `client/lib/api.ts` (`apiGet/apiPost/apiPut/apiPatch/apiDelete`);
  never `fetch` directly from components or pages.
- **Auth state in components**: `useAuth()` from `client/context/AuthContext.tsx`.
- **Logging**: `server/utils/logger.js` exports an object — `{ logger, httpLogger, performanceLogger,
  securityLogger, adminAuditLogger }`. Always destructure: `const { logger } = require('../utils/logger')`.
  Calling `logger.error(...)` on the module object itself is a TypeError.
- **Frontend styling**: tokens live in `client/app/globals.css` (`@theme inline`); components use
  token-based utility classes, not raw hex.

## Testing

Playwright only (`e2e/`), run against a live client+server pair. There is no unit-test framework on
either side. `client/next.config.mjs` no longer ignores type or lint errors — a green
`npm --prefix client run build` is the gate.

## Notes

- `server/.env` and `client/.env.local` are gitignored and required; the server fails fast when a
  required variable is missing. Changing `ENCRYPTION_SECRET` makes existing stored credentials
  undecryptable.
- Redis is optional (`REDIS_URL`); without it the cache falls back to in-process memory. Force-logout
  propagation therefore assumes a single server replica.
- Deployment: CI pushes images to GHCR and updates the `deploy` branch, which Coolify watches.
