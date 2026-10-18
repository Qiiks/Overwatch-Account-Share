# Round 1 — three visual directions for Overwatch Account Share

Static, self-contained HTML comps rendered to PNG. **Mock data only** — no API, no live socket.
Every number, handle, Battle.net tag, code and mailbox in these screens is synthetic and must be
replaced with real values when the direction is built.

- Rendered: 18 Oct 2026, managed Chromium (headless, Chrome/150 UA), viewport 1440×900 and
  390×844 at `deviceScaleFactor: 2` (PNG pixel size 2880×1800 / 780×1688).
- Fonts: **Geist + Geist Mono variable** copied from `client/node_modules/geist/dist/fonts/`
  (`fonts/Geist-Variable.woff2` sha256 `9ce2d978…cfbd6`, `fonts/GeistMono-Variable.woff2` sha256
  `119f3e15…127f7`). No font substitution — these are the exact faces the app already ships via
  `next/font`. No network access at render time.
- CSS animations are frozen at a fixed phase before capture, so ambient motion (sweep, aurora,
  countdown bar, travelling pulse) is visible in the stills.

## Files

| Direction | Landing | Dashboard | Mobile (390×844) | Tokens |
|---|---|---|---|---|
| A · DISPATCH | `dispatch/landing-1440x900@2x.png` | `dispatch/dashboard-1440x900@2x.png` | `dispatch/landing-390x844@2x.png` | `dispatch/tokens.css` |
| B · VAULT | `vault/landing-1440x900@2x.png` | `vault/dashboard-1440x900@2x.png` | `vault/landing-390x844@2x.png` | `vault/tokens.css` |
| C · FIELD | `field/landing-1440x900@2x.png` | `field/dashboard-1440x900@2x.png` | `field/landing-390x844@2x.png` | `field/tokens.css` |

Sources (editable masters, one HTML per screen, no build step): `dispatch/landing.html`,
`dispatch/dashboard.html`, `vault/landing.html`, `vault/dashboard.html`, `field/landing.html`,
`field/dashboard.html`. Serve the folder over HTTP (`python3 -m http.server`) — `file://` also works.

## A · DISPATCH — the control room

**Idea:** the tool is an instrument, not a website. Accounts are channels, the relay is a live
broadcast, and the page is a rundown with a status line. **Loud:** the login code as a giant mono
readout with a lime countdown bar, and the event tape that narrates every handoff. **Quiet:**
everything else — graphite panels, hairline rules, corner registration ticks, no glow, no gradient.
Density is the point: 12.5px table body, mono tags, `tabular-nums`, state chips that mean something
(`Live` / `Idle` / `Private`). **Background — "GRID & SWEEP":** two static `repeating-linear-gradient`
grids (72px fine, 288px coarse, radially masked) plus one 340px sweep band moved by a single
composited `transform` on a 15s loop. Zero JS, zero canvas, one animated element: cheaper than the
`DotGrid` it replaces, which mounted a canvas per page. Ship the sweep as a one-shot on app screens
(hero only) so nothing runs permanently behind a working table.

## B · VAULT — the sealed handoff

**Idea:** a vault ceremony with depth — accounts are sealed slabs, and the code is the only warm
object in a cold blue field. **Loud:** the seal ring, where a conic ice gradient, a countdown arc and
the amber code sit in front of the slabs that hold the credentials and the mailbox. **Quiet:** the
type (one sans, sentence case, −0.03em), the space, and the material — every surface is a double
bezel (outer shell 22px, inner core 16px, inner highlight) with a wide offset shadow, no glow border.
**Background — "AURORA DEPTH":** three very large radial-gradient layers drifting on 120/150/180s
`transform` loops (the softness is in the gradient stops, so no `filter: blur` is animated), plus a
static grain layer and a vignette. Compositor-only, no canvas, no rAF. The one `backdrop-filter`
belongs to the fixed nav pill; the slabs use translucent fills and hairlines instead, so scrolling
content never pays for blur.

## C · FIELD — the signal between two players

**Idea:** the handoff drawn as a signal travelling across a field — owner → account → session — at
1.2 seconds, which is the one number this product owns. **Loud:** the display line ("Your login code,
their session, 1.2 seconds.") at up to 88px, the orange CTA with its nested arrow orb, and the
cropped wordmark bleeding off the bottom edge. **Quiet:** true-black ground, 13.5px UI type, hairline
table rules, a mono ticker of real events. **Background — "FLOW FIELD":** one canvas mounted once in
the AppShell; ~90–170 particles advected by a slowly rotating sine/cosine field, 1px orange strokes
at 5–14% alpha, per-frame fade 0.022 (that decay is what makes trails), rAF capped to ~30fps by
timestamp skipping, DPR capped at 1.5, paused on `visibilitychange`, and a single pre-advanced frame
under `prefers-reduced-motion`. The most expensive of the three, and still far below the cost of the
per-page `DotGrid` canvases it replaces (140 points, no full-screen repaint of blurred layers).

## Notes and limitations

- Mock content is synthetic. `relay median 1.2s`, `12 online`, `9 accounts in vault` are plausible
  placeholders, not measurements; the AES-256-GCM claim comes from the codebase, not from a benchmark.
- Dashboard mobile (390×844) was not rendered this round — Main capped the round at one mobile shot
  per direction; the CSS has a 390 breakpoint wired for the dashboards (rail becomes a horizontal
  index strip / nav pill survives / channel list scrolls) but it is unverified pixels.
- `prefers-reduced-motion` is implemented in all six files (static background, no reveals) but the
  reduced-motion *stills* were not captured.
- Error/empty states, modals, admin, auth, 404, privacy and terms are round-2 screens; only landing
  and dashboard were comped.
- Focus, hover, disabled and loading states exist in the CSS but a still cannot demonstrate them.
- Motion is frozen for capture; the shipped behaviour is the animation, not the frozen frame.
