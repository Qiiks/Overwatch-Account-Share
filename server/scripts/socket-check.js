#!/usr/bin/env node
/**
 * Socket authorization gate: an owner's socket receives the pushed code, an anonymous socket
 * receives nothing.
 *
 * Criterion it exists for: "anonymous socket gets no OTP". The envelope gate cannot see this
 * (the socket is not a route) and the Playwright suite has no socket client, so without this
 * script that criterion rests on reading the handshake middleware rather than on evidence.
 *
 *   server running on PORT (default 5001), NODE_ENV != production, DEV_TOOLS=true
 *   SMOKE_EMAIL / SMOKE_PASSWORD default to the seed-dev owner
 *
 *   node server/scripts/socket-check.js
 *
 * The code is pushed through POST /api/dev/emit-otp (dev-only, owner-only), so no Gmail
 * mailbox is needed. Both halves are asserted: the positive one proves the emit path and the
 * room actually work, which is what keeps the negative half from passing for the wrong reason.
 *
 * Exit 0 = owner received at least one otp_update and the anonymous socket received none.
 */
const path = require('path');

// socket.io-client is a client dependency; resolve it from there rather than adding a second
// copy to this workspace (root/server deps never reach it, and hoisting makes the path safe
// to compute instead of hardcoding).
const { io } = require(require.resolve('socket.io-client', {
  paths: [path.resolve(__dirname, '../../client')],
}));

const BASE = process.env.E2E_API_BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
const EMAIL = process.env.SMOKE_EMAIL || 'dev-owner@example.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'DevPassw0rd!';
const WAIT_MS = Number(process.env.SOCKET_WAIT_MS || 3000);

// Minimal cookie jar: Node's fetch has none, and the session lives in an httpOnly cookie.
const jar = new Map();
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
const remember = (response) => {
  const raw = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  for (const line of raw) {
    const [pair] = line.split(';');
    const [name, ...rest] = pair.split('=');
    jar.set(name.trim(), rest.join('='));
  }
  return response;
};
const call = (method, url, body, csrf) =>
  fetch(`${BASE}${url}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(jar.size ? { cookie: cookieHeader() } : {}),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(remember);

const fail = (message) => {
  console.log(`[socket] FAIL — ${message}`);
  process.exit(1);
};

const main = async () => {
  const csrfResponse = await call('GET', '/api/auth/csrf');
  const csrf = ((await csrfResponse.json()).data || {}).token;
  if (!csrf) fail('no CSRF token from /api/auth/csrf');

  const login = await call('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD }, csrf);
  if (login.status !== 200) {
    fail(`login for ${EMAIL} answered ${login.status} (${JSON.stringify(await login.json())})`);
  }
  const session = jar.get('auth_token');
  if (!session) fail('login did not set the auth_token cookie');

  const list = await call('GET', '/api/overwatch-accounts');
  const accounts = (await list.json()).data || [];
  if (!Array.isArray(accounts) || accounts.length === 0) {
    fail(`no accounts to push a code for (GET /api/overwatch-accounts -> ${list.status})`);
  }
  const accountId = accounts[0].id;

  const ownerEvents = [];
  const anonEvents = [];
  const owner = io(BASE, {
    transports: ['websocket'],
    reconnection: false,
    extraHeaders: { Cookie: `auth_token=${session}` },
  });
  const anon = io(BASE, { transports: ['websocket'], reconnection: false });
  owner.on('otp_update', (payload) => ownerEvents.push(payload));
  anon.on('otp_update', (payload) => anonEvents.push(payload));

  // A rejected or unreachable handshake emits connect_error instead of retrying (reconnection
  // is off), so both outcomes need binding or the check hangs instead of reporting.
  const connected = (socket, label) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${label} did not connect within 10s`)),
        10000,
      );
      socket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.on('connect_error', (error) => {
        clearTimeout(timer);
        reject(new Error(`${label} connect_error: ${error && error.message}`));
      });
    });

  try {
    await Promise.all([connected(owner, 'owner socket'), connected(anon, 'anonymous socket')]);
  } catch (error) {
    owner.close();
    anon.close();
    fail(error.message);
  }

  const emit = await call('POST', '/api/dev/emit-otp', { accountId, otp: '424242' }, csrf);
  if (emit.status !== 200) {
    fail(`POST /api/dev/emit-otp answered ${emit.status} (${JSON.stringify(await emit.json())})`);
  }

  await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  owner.close();
  anon.close();

  const received = ownerEvents.map((event) => event && event.otp).join(',');
  if (ownerEvents.length === 0) {
    fail(`the owner's socket received no otp_update within ${WAIT_MS}ms — the emit path or the room is broken`);
  }
  if (anonEvents.length > 0) {
    fail(`an anonymous socket received ${anonEvents.length} otp_update payload(s): ${JSON.stringify(anonEvents[0])}`);
  }

  console.log(
    `[socket] OK — owner received ${ownerEvents.length} otp_update (otp=${received}); ` +
      `anonymous socket received none within ${WAIT_MS}ms.`,
  );
  process.exit(0);
};

main().catch((error) => {
  fail(error && error.stack ? error.stack : String(error));
});
