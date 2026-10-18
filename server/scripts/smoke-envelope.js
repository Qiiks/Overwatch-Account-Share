#!/usr/bin/env node
/**
 * Envelope completeness gate: every JSON API route must answer with
 * `{ success: boolean, ... }` — success or error, it must be the envelope.
 *
 *   NODE_ENV=test node server/scripts/smoke-envelope.js
 *
 * Health probes (/health, /ready, /api/health) are infrastructure contracts and are exempt.
 * Auth-protected routes are expected to answer 401/403 — the point is the body shape, not the status.
 */
process.env.NODE_ENV = 'test';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const request = require('supertest');
const listEndpoints = require('express-list-endpoints');

const EXEMPT = ['/health', '/ready', '/api/health'];

const main = async () => {
  const { app } = require('../server');

  const endpoints = listEndpoints(app).filter(
    (endpoint) => !EXEMPT.includes(endpoint.path) && !endpoint.path.startsWith('/socket.io'),
  );

  const offenders = [];
  let checked = 0;
  for (const endpoint of endpoints) {
    // Fill path params so the request lands on the real handler instead of a 404 fallthrough.
    const url = endpoint.path.replace(/:[A-Za-z0-9_]+/g, '00000000-0000-4000-8000-000000000000');

    for (const method of endpoint.methods) {
      checked += 1;
      let body;
      let status;
      try {
        const response = await request(app)[method.toLowerCase()](url).send({});
        status = response.status;
        body = response.body;
      } catch (error) {
        offenders.push({ method, url, status: 'error', detail: error.message });
        continue;
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
    }
  }

  console.log(`Checked ${checked} method+route pairs (health probes exempt).`);
  if (offenders.length === 0) {
    console.log('All routes answer with the envelope.');
    process.exit(0);
  }

  console.log(`\n${offenders.length} route(s) do NOT answer with the envelope:`);
  for (const offender of offenders) {
    console.log(`  ${offender.method.toUpperCase()} ${offender.url} -> ${offender.status} (${offender.detail})`);
  }
  process.exit(1);
};

main().catch((error) => {
  console.error('Smoke run failed:', error.message);
  process.exit(1);
});
