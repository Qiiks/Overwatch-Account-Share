import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * API-level security assertions. These run against the real server (see the webServer
 * entries in playwright.config.ts) and need the dev seed: ALLOW_DEV_SEED=1 node
 * server/scripts/seed-dev.js, plus an admin (ADMIN_EMAIL/ADMIN_PASSWORD via create-admin).
 */
const API = process.env.E2E_API_BASE_URL || 'http://localhost:5001';
const OWNER = {
  email: process.env.SMOKE_EMAIL || 'dev-owner@example.com',
  password: process.env.SMOKE_PASSWORD || 'DevPassw0rd!',
};
const ADMIN = {
  email: process.env.ADMIN_EMAIL || '',
  password: process.env.ADMIN_PASSWORD || '',
};

const csrfToken = async (request: APIRequestContext) => {
  const response = await request.get(`${API}/api/auth/csrf`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  return body.data.token as string;
};

const loginAs = async (request: APIRequestContext, email: string, password: string) => {
  const token = await csrfToken(request);
  const response = await request.post(`${API}/api/auth/login`, {
    headers: { 'x-csrf-token': token },
    data: { email, password },
  });
  return { response, token };
};

test.describe('security', () => {
  test('anonymous callers cannot enumerate the account roster', async ({ request }) => {
    const response = await request.get(`${API}/api/overwatch-accounts/all-public`);
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  test('login never returns a token in the body', async ({ request }) => {
    const { response } = await loginAs(request, OWNER.email, OWNER.password);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.user).toBeTruthy();
    expect(body.data.user).not.toHaveProperty('password_hash');
    expect(JSON.stringify(body)).not.toContain('$2b$');
    expect(body.data).not.toHaveProperty('token');
    expect(body.data).not.toHaveProperty('tokenExpiresAt');
  });

  test('the session cookie is httpOnly and the CSRF cookie is issued once', async ({ request }) => {
    await loginAs(request, OWNER.email, OWNER.password);

    const cookies = await request.storageState();
    const auth = cookies.cookies.find((cookie) => cookie.name === 'auth_token');
    expect(auth, 'auth_token cookie must be set by login').toBeTruthy();
    expect(auth!.httpOnly).toBe(true);

    const first = await request.get(`${API}/api/auth/csrf`);
    const second = await request.get(`${API}/api/auth/csrf`);
    const firstToken = (await first.json()).data.token;
    const secondToken = (await second.json()).data.token;
    expect(secondToken).toBe(firstToken);
  });

  test('mutations without a CSRF header are rejected', async ({ request }) => {
    await loginAs(request, OWNER.email, OWNER.password);

    const response = await request.post(`${API}/api/overwatch-accounts`, {
      data: { accountTag: 'NoCsrf#1', accountEmail: 'no-csrf@example.com', accountPassword: 'x' },
    });
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CSRF_HEADER_MISSING');
  });

  test('admin search rejects PostgREST filter injection', async ({ request }) => {
    test.skip(!ADMIN.email || !ADMIN.password, 'ADMIN_EMAIL/ADMIN_PASSWORD not provided');

    const { response } = await loginAs(request, ADMIN.email, ADMIN.password);
    expect(response.status()).toBe(200);

    const injected = await request.get(
      `${API}/api/admin/search?type=users&query=${encodeURIComponent('foo,email.ilike.*')}`,
    );
    expect(injected.status()).toBe(400);

    const body = await injected.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  test('an unauthenticated unknown route still answers with the envelope', async ({ request }) => {
    const response = await request.get(`${API}/api/does-not-exist`);
    const body = await response.json();
    expect(typeof body.success).toBe('boolean');
  });
});
