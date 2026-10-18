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
 *      the seed-dev owner) and replays every route with its session + CSRF token, so route
 *      handlers actually execute. Pass 2 is the one with teeth; without credentials the
 *      script says so and exits on pass 1 only.
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
];
const SAMPLE_ID = '00000000-0000-4000-8000-000000000000';

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

const runPass = async (agent, routes, label, csrfToken) => {
  const offenders = [];
  for (const { method, url } of routes) {
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
    authenticatedOffenders = await runPass(agent, routes, 'authenticated', token);
  } else {
    console.log(
      `[authenticated] skipped — login for ${smokeEmail} answered ${login.status} ` +
        `(${JSON.stringify(login.body)}). Seed a dev user (ALLOW_DEV_SEED=1 node scripts/seed-dev.js) ` +
        'or set SMOKE_EMAIL/SMOKE_PASSWORD.',
    );
  }

  const offenders = [...anonymousOffenders, ...authenticatedOffenders];
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
