# Backend — Overwatch Account Share

Express 4 API server. No ORM: it talks to Supabase (PostgREST) through `@supabase/supabase-js`,
using the service-role key server-side (RLS is bypassed by design; every access check is app-level).

## Layout

- `server.js` — entry point; middleware order: cors → helmet → cookieParser → csrfProtection →
  compression → express.json → logging/perf → rate limits → routes → errorMiddleware.
- `config/db.js` — the single Supabase client (`global.supabase` + module export).
- `routes/` → `controllers/` → `models/` (thin PostgREST wrappers) → `services/` (OTP poller),
  `utils/` (logger, encryption, cookies, cache, respond/ApiError).
- `migrations/` — SQL to apply by hand in the Supabase SQL editor (`0001_baseline.sql` builds a fresh DB).
- `scripts/` — admin bootstrap, dev seed, credential audit, OTP emit harness.

## Conventions

- Responses: `ok(res, data, status?, meta?)` → `{ success: true, data }`; errors are thrown as
  `new ApiError(status, code, message, details?)` and normalised by `middleware/errorMiddleware.js`
  into `{ success: false, error: { message, code, details? } }`. Codes: `VALIDATION_FAILED`,
  `UNAUTHENTICATED`, `FORBIDDEN`, `CSRF_*`, `NOT_FOUND`, `CONFLICT`, `PAYLOAD_TOO_LARGE`,
  `RATE_LIMITED`, `UPSTREAM_UNAVAILABLE`, `INTERNAL`.
- Auth: JWT in an httpOnly cookie (`auth_token`); CSRF by double-submit (`csrf-token` cookie +
  `x-csrf-token` header) plus an Origin allowlist on non-GET.
- Secrets: account credentials are AES-256-GCM encrypted at rest with a key derived from
  `ENCRYPTION_SECRET`; never log or return plaintext except through the access-checked endpoints.
- Logging: `utils/logger.js` exports an object — `{ logger, httpLogger, performanceLogger,
  securityLogger, adminAuditLogger }`. Always destructure:
  `const { logger } = require('../utils/logger')`. Using the module object directly
  (`const logger = require('../utils/logger')` then `logger.error(...)`) is a TypeError.

## Commands

- `npm run dev` — start with `node --watch`
- `npm start` — production start
- `npm run setup-admin` — create the first admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- `npm run audit` — production dependency audit

## Environment

`.env` in this directory (gitignored). Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `ENCRYPTION_SECRET`, `OAUTH_STATE_SECRET`,
`ALLOWED_ORIGINS` (comma-separated) or `FRONTEND_URL`. Optional: `PORT` (5001), `NODE_ENV`,
`CLIENT_URL`, `COOKIE_SAMESITE`, `HSTS_INCLUDE_SUBDOMAINS`, `OTP_FETCH_INTERVAL_MS`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `REGISTRATION_OPEN` is no longer
read — registration is controlled by the `settings.allow_registration` row.

## Testing

There is no server unit-test framework. End-to-end coverage lives in the repo root (`e2e/`,
Playwright) and runs against a live client+server pair.
