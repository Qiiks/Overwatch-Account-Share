#!/usr/bin/env node
/**
 * Envelope completeness gate: every JSON API route must answer with
 * `{ success: boolean, ... }` — success or error, it must be the envelope.
 *
 *   NODE_ENV=test LOG_LEVEL=error node server/scripts/smoke-envelope.js
 *   (with dummy values for the Supabase, JWT, encryption, OAuth-state and origin variables the
 *    anonymous pass still exercises the middleware and controller paths)
 *
 * Two passes:
 *   1. anonymous  — proves the middleware chain answers in the envelope shape.
 *   2. authenticated — logs in as a dev user (SMOKE_EMAIL / SMOKE_PASSWORD, defaulting to
 *      the seed-dev owner), proves the session with GET /api/auth/me, then replays every route
 *      with its CSRF token so route handlers actually execute. If the login or that probe fails
 *      the run exits 1: an anonymous-only pass proves nothing about authenticated handlers, so
 *      accepting one is an explicit choice (SMOKE_ALLOW_ANON_ONLY=1). With SMOKE_ADMIN=1 (and
 *      an admin SMOKE_EMAIL) every admin handler runs too, except the mutation routes listed in
 *      DESTRUCTIVE_ADMIN_PATHS.
 *
 * A 5xx is always an offender — including the 502 the dummy-environment invocation above gets
 * from every data route when Supabase is unreachable. SMOKE_ALLOW_UPSTREAM_DOWN=1 tolerates
 * exactly that case and reports the count, because a gate that passes against a dead database
 * says nothing about the handlers it claims to cover.
 *
 * Health probes (/health, /ready, /api/health) are infrastructure contracts and are exempt.
 */
process.env.NODE_ENV = 'test';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const request = require('supertest');
const listEndpoints = require('express-list-endpoints');

const EXEMPT = [
  '/health',
  '/ready',
  '/api/health',
  // Browser redirect endpoint (Google OAuth callback) — not a JSON API.
  '/api/google-auth/otp/callback',
  // CSV file download — a file body must not be wrapped in JSON.
  '/api/admin/export-users',
];
const SAMPLE_ID = '00000000-0000-4000-8000-000000000000';

// 5xx the operator explicitly accepted via SMOKE_ALLOW_UPSTREAM_DOWN=1 (the dummy-env mode).
// Reported at the end: a degraded run must not read as full coverage.
const tolerated = [];

// Admin mutations that would change live state (force-logout invalidates every session,
// clear-cache wipes the cache, the rest edit users/accounts). With SMOKE_ADMIN=1 the
// authenticated pass runs as an admin and skips exactly these; their handlers stay covered
// by the unit-level review and the Playwright suite, which seeds its own fixtures.
const DESTRUCTIVE_ADMIN_PATHS = [
  '/api/admin/force-logout',
  '/api/admin/clear-cache',
  '/api/admin/create-user',
  '/api/admin/share-account',
  '/api/admin/toggle-registrations',
  '/api/admin/users',
];

// Routes that end the session under test: logout clears the auth cookie and change-password
// rotates the credential. Sweeping them mid-run 401s every later request — and stays green
// while doing it, because a 401 is a perfectly valid envelope. The caller re-proves the session
// before and after the sweep so this cannot pass silently again.
const SESSION_BREAKING_PATHS = ['/api/auth/logout', '/api/auth/change-password'];

const smokeEmail = process.env.SMOKE_EMAIL || 'dev-owner@example.com';
const smokePassword = process.env.SMOKE_PASSWORD || 'DevPassw0rd!';

const collectRoutes = (app) =>
  listEndpoints(app)
    .filter(
      (endpoint) => !EXEMPT.includes(endpoint.path) && !endpoint.path.startsWith('/socket.io'),
    )
    .flatMap((endpoint) =>
      endpoint.methods.map((method) => ({
        method,
        url: endpoint.path.replace(/:[A-Za-z0-9_]+/g, SAMPLE_ID),
      })),
    );

const checkBody = (method, url, status, body, offenders) => {
  // A 5xx is the failure this gate exists to catch: errorMiddleware answers it with
  // { success: false, error }, so an envelope-only assertion passes a broken handler.
  if (typeof status === 'number' && status >= 500) {
    // The dummy-environment mode the header documents answers 502 UPSTREAM_UNAVAILABLE on
    // every data route. That is still not coverage, so it is only tolerated when the operator
    // says so, and it is counted and printed — never silently dropped.
    const upstreamDown = body && body.error && body.error.code === 'UPSTREAM_UNAVAILABLE';
    if (upstreamDown && process.env.SMOKE_ALLOW_UPSTREAM_DOWN === '1') {
      tolerated.push({ method, url, status });
      return;
    }
    offenders.push({ method, url, status, detail: 'server error' });
    return;
  }
  if (!body || typeof body.success !== 'boolean') {
    offenders.push({
      method,
      url,
      status,
      detail:
        typeof body === 'object'
          ? `keys: ${Object.keys(body || {}).join(',') || '(none)'}`
          : typeof body,
    });
  }
};

const runPass = async (agent, routes, label, csrfToken, options = {}) => {
  const offenders = [];
  for (const { method, url } of routes) {
    if (
      options.authenticated &&
      SESSION_BREAKING_PATHS.some((prefix) => url.startsWith(prefix))
    ) {
      continue;
    }
    if (
      options.skipDestructiveAdmin &&
      method !== 'GET' &&
      DESTRUCTIVE_ADMIN_PATHS.some((prefix) => url.startsWith(prefix))
    ) {
      continue;
    }
    let response;
    try {
      const pending = agent[method.toLowerCase()](url);
      if (csrfToken && method !== 'GET') pending.set('x-csrf-token', csrfToken);
      response = await pending.send({});
    } catch (error) {
      offenders.push({ method, url, status: 'error', detail: error.message });
      continue;
    }
    checkBody(method, url, response.status, response.body, offenders);
  }

  console.log(`[${label}] checked ${routes.length} method+route pairs.`);
  return offenders;
};

const main = async () => {
  const { app } = require('../server');
  const routes = collectRoutes(app);

  // Prime the CSRF cookie+token on the agent, exactly as the browser does on first load,
  // so non-GET requests in both passes get past csrfProtection and reach their handlers.
  const primeAgent = async (agent) => {
    const response = await agent.get('/api/auth/csrf');
    return response.body && response.body.data && response.body.data.token;
  };

  const anonymousAgent = request.agent(app);
  const anonymousToken = await primeAgent(anonymousAgent);
  const anonymousOffenders = await runPass(anonymousAgent, routes, 'anonymous', anonymousToken);

  let authenticatedOffenders = [];
  let authenticated = false;
  const agent = request.agent(app);

  // Prime the jar *before* building the request: supertest snapshots the agent's cookies
  // when the request object is created, so a token fetched afterwards would not be sent.
  const loginToken = await primeAgent(agent);

  const login = await agent
    .post('/api/auth/login')
    .set('x-csrf-token', loginToken || '')
    .send({ email: smokeEmail, password: smokePassword });

  if (login.status === 200) {
    authenticated = true;
    const token = await primeAgent(agent);
    // Prove the session at the moment the sweep starts. An earlier placement — right after
    // login, before the CSRF fetch — passed while the sweep itself ran anonymously, so it
    // proved nothing about the requests that followed.
    const sessionBefore = await agent.get('/api/auth/me');
    if (sessionBefore.status !== 200) {
      console.log(
        `[authenticated] failing: the session did not take — GET /api/auth/me answered ${sessionBefore.status} ` +
          `(${JSON.stringify(sessionBefore.body)}).`,
      );
      process.exit(1);
    }
    const asAdmin = process.env.SMOKE_ADMIN === '1';
    if (asAdmin) {
      console.log(
        '[authenticated] SMOKE_ADMIN=1 — running as an admin; destructive admin routes are skipped.',
      );
    }
    authenticatedOffenders = await runPass(agent, routes, 'authenticated', token, {
      skipDestructiveAdmin: asAdmin,
      authenticated: true,
    });
    // And prove it survived the sweep: a route that ends the session would otherwise turn the
    // rest of the run into anonymous 401s that still count as valid envelopes.
    const sessionAfter = await agent.get('/api/auth/me');
    if (sessionAfter.status !== 200) {
      console.log(
        '[authenticated] failing: the sweep ended the session — every request after that point ' +
          'answered as an anonymous caller, which the envelope check cannot detect.',
      );
      process.exit(1);
    }
  } else {
    console.log(
      `[authenticated] skipped — login for ${smokeEmail} answered ${login.status} ` +
        `(${JSON.stringify(login.body)}). Seed a dev user (ALLOW_DEV_SEED=1 node scripts/seed-dev.js) ` +
        'or set SMOKE_EMAIL/SMOKE_PASSWORD.',
    );
    // An anonymous-only pass cannot say anything about authenticated handlers, so a green
    // exit here would be a false claim. Opt out explicitly when that is really what you want.
    if (process.env.SMOKE_ALLOW_ANON_ONLY !== '1') {
      console.log('[authenticated] failing: set SMOKE_ALLOW_ANON_ONLY=1 to accept an anonymous-only pass.');
      process.exit(1);
    }
  }

  const offenders = [...anonymousOffenders, ...authenticatedOffenders];
  if (tolerated.length > 0) {
    console.log(
      `[tolerated] ${tolerated.length} route(s) answered 502 UPSTREAM_UNAVAILABLE with ` +
        'SMOKE_ALLOW_UPSTREAM_DOWN=1: the envelope holds, but no data route was proven ' +
        'against a database in this run.',
    );
  }
  if (offenders.length === 0) {
    console.log(
      authenticated
        ? 'All routes answer with the envelope (anonymous + authenticated).'
        : 'All routes answer with the envelope (anonymous pass only).',
    );
    process.exit(0);
  }

  console.log(`\n${offenders.length} route(s) do NOT answer with the envelope:`);
  for (const offender of offenders) {
    console.log(
      `  ${offender.method} ${offender.url} -> ${offender.status} (${offender.detail})`,
    );
  }
  process.exit(1);
};

main().catch((error) => {
  console.error('Smoke run failed:', error.message);
  process.exit(1);
});
