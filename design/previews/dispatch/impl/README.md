# DISPATCH — implementation screenshots

Captured from the production build (`next build` → `next start`, Node 26) on Chromium at
`deviceScaleFactor: 2`, so a 1440×900 CSS frame is 2880×1800 px, a 768×1024 one is
1536×2048, and a 390×844 one is 780×1688.

## Full route × viewport grid (9 routes × 3 viewports)

`landing, login, register, privacy, terms, not-found, dashboard, accounts, admin` at
`390x844`, `768x1024` and `1440x900` — every file named `<route>-<w>x<h>@2x.png`. All of them
were captured with the API stubbed in-browser (see below); each capture is gated on rendered
content and asserts the final path, and none reported horizontal overflow at any width.
`<route>-768x1024@2x.png` and the 390-wide `privacy`/`terms`/`not-found` frames come from the
verification pass, which also retook every other `<route>-<w>x<h>@2x.png` in this grid — so
each named frame is current. The design pass's detail shots are untouched:
`landing-hero`, `landing-1440x900-reduced-motion`, `dashboard-modal`, `accounts-revealed`,
`register-rules-met`, `panel-relay-detail`.

## Real (no stubs)

| File | Route / state |
|---|---|
| `landing-1440x900@2x.png` | `/` — sweep band mid-viewport (the one authored moment) |
| `landing-hero@2x.png` | `/` — hero + relay panel, detail crop |
| `landing-390x844@2x.png` | `/` — full page |
| `login-1440x900@2x.png`, `login-390x844@2x.png` | `/login` |
| `panel-relay-detail.png` | the relay panel at 1× for pixel inspection |

The landing screenshots show `0 ONLINE NOW · ACCOUNTS BY APPROVAL`: the socket count is
live (server up, 0 sockets), and the registration gate is **closed** because
`GET /api/auth/registration-status` cannot reach the database in this environment. That is
the fail-closed path working, not a mock.

## Reduced motion (`prefers-reduced-motion: reduce`)

`landing-1440x900-reduced-motion@2x.png` — captured after the same 7.2 s wait that puts the
sweep mid-viewport in the normal shot, so the A/B pair is a genuine comparison (the two files
hash differently). Measured on the element: sweep layer `display: none`, `document.getAnimations()`
→ 0 running, rundown row `transition-duration: 1e-06s` and 0 animations.

## Stubbed (database unreachable — no Supabase in this environment)

`register-1440x900-mocked-gate@2x.png`, `register-390x844-mocked-gate@2x.png`,
`register-rules-met@2x.png` — `/register` with `GET /api/auth/registration-status` fulfilled in
the browser as `{ success: true, data: { allow_registration: true } }`. Writes nothing, changes
no source. With the real API the route redirects to `/login` (registration closed).

The whole grid above is stubbed the same way — `/api/auth/me`, `/api/dashboard`,
`/api/overwatch-accounts/all-public`, `/api/google-auth/accounts`, `/api/admin/*` — so the
authenticated screens render without a database. `anonymous-redirect-1440x900@2x.png` is the
one exception: it is a real behaviour capture (`/dashboard` → `/login`, no stubs).

