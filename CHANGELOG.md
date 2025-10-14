### OTP Refresh Interval & Live Updates (2025-10-14)
- Reduced the OTP polling interval to 10s with overlap guards so new codes propagate quickly without saturating the service.
- Broadcast OTP socket events to the shared `otp-updates` channel and auto-subscribe the accounts view for real-time UI refreshes.

### Registration Toggle Settings Sync Fix (2025-10-14)
- Taught the settings context to parse the backend payload format so `allow_registration` reflects server state.
- Triggered a context refresh after toggling registration in the admin UI to keep the registration page in sync.

### CSRF Health Check Endpoint Fix (2025-10-14)
- Added a concrete App Router handler at `/api/health` to return a 200 JSON payload for CSRF initialization.
- Verified the endpoint manually via `curl` to ensure the CSRF helper no longer receives 503 responses.

### CSRF Cookie Accessibility Fix (2025-10-14)
- Updated the CSRF middleware to emit a client-readable token cookie so the frontend can mirror it in request headers.
- Validated the login flow end-to-end via Playwright MCP using the provided credentials to confirm CSRF initialization succeeds and the dashboard loads without errors.

### Admin Role Management Fix (2025-10-14)
- Added backend endpoint `/api/admin/users/:id/role` to handle user role updates (make admin/remove admin)
- Implemented validation chain for role updates with proper error handling
- Updated UserActions component to properly call the backend API for role changes
- Added proper success notifications and user interface updates
- Verified functionality end-to-end via Playwright MCP testing

### Accounts Page Button Cleanup (2025-10-14)
- Removed "Manage Account" and "Request Access" buttons from Accounts page as requested
- Kept "Share Access" button for functional sharing capability
- Cleaned up unused `requestAccess` function from AccountsList component
- Verified UI updates via Playwright MCP testing

### Frontend-Backend Integration and DotGrid Optimization (2025-09-20)
- Connected the new-client frontend to the backend API, removing all mock data.
- Updated all API endpoints in new-client to use backend port 5001.
- Implemented client-side password validation and feedback in registration form.
- Standardized backend login and registration response formats to match frontend expectations.
- Modified backend registration endpoint to return JWT token and user role.
- Diagnosed and resolved authentication failures due to strict password validation and missing JWT.
- Diagnosed and fixed backend schema error: added missing "password" column to "users" table via migration.
- Verified registration, login, and protected route access with Playwright MCP server tests.
- Replaced the DotGrid component in new-client with the improved version from the old client.
- Fixed export/import issues for DotGrid to ensure compatibility across all pages.

### Comprehensive E2E Test Implementation and Automated Fixes (2025-09-22)
- Completed comprehensive Playwright MCP E2E tests covering authentication, registration, dashboard access, and backend integration.
- Automated fixes applied:
  - All backend models and controllers updated to use lowercase column names for full Supabase compatibility.
  - Dashboard controller now maps backend fields to frontend camelCase expectations, resolving all legacy field mismatches.
  - `/api/auth/me` controller fixed to remove references to non-existent `googleid` column.
  - All integration errors between backend and frontend resolved, including legacy field mismatches.
- All major user flows and integration points now work end-to-end with no errors detected.
- The codebase is now stable and passes all major E2E scenarios.

### Backend Supabase Client Alignment and Google Account Model Enhancements (2025-10-07)
- Updated dashboard and Overwatch account controllers to consume the shared Supabase client export reliably, fixing runtime 500 errors on `/api/dashboard`.
- Added missing helper methods (`findByUserId`, `upsert`, `deleteById`) to `UserGoogleAccount` model with manual Supabase upsert logic and consistent column mapping to restore Google account management endpoints.

### Authentication Response Improvements and Admin Navigation Fix (2025-10-07)
- Extended the login controller response to include role, admin flag, username, and approval status for downstream clients.
- Persisted username and admin privileges in local storage after login and dashboard fetch so the navigation renders the Admin button when appropriate.

### Production Health Endpoint for Coolify Deployment (2025-10-09)
- Added a dedicated Next.js App Router API route at `/api/health` so platform-level health checks succeed.
- Ensured the Docker health probe can validate the frontend container without triggering false 503 responses.

### Configurable CORS and Socket Origins (2025-10-09)
- Centralized API and WebSocket origin allow-lists with support for environment overrides to permit production domains.
- Normalized and protocol-expanded origin handling (http/https + ws/wss) and updated Helmet CSP `connect-src` policy so production dashboard requests and socket handshakes succeed.
- Added the current production hosts to the default allow-list to cover deployments even if environment variables are missing.
- Hardened the CORS middleware to normalize origins, enforce headers on every response, and surface explicit 403 errors for disallowed origins to unblock production login requests.

### Google OAuth Redirect Resolution (2025-10-09)
- Taught the backend to compute the Google OAuth redirect URI dynamically from env configuration, client URL, or proxy headers so HTTPS callbacks match Google Console settings in production.
- Enabled `trust proxy` on Express to honor `x-forwarded-proto`, preventing mismatched `http` redirects behind Coolify/NGINX.