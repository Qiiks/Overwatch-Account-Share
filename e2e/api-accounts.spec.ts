import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Account + credential behaviour against the real API. The round-trip test is the one that
 * proves the HTML-escaping-before-encryption bug stays fixed: a password containing
 * ' & < > # must come back byte-identical.
 */
const API = process.env.E2E_API_BASE_URL || 'http://localhost:5001';
const OWNER = {
  email: process.env.SMOKE_EMAIL || 'dev-owner@example.com',
  password: process.env.SMOKE_PASSWORD || 'DevPassw0rd!',
};

const TRICKY_PASSWORD = "p'a&<b>#1";

const freshSession = async (request: APIRequestContext) => {
  const csrf = await request.get(`${API}/api/auth/csrf`);
  const token = (await csrf.json()).data.token as string;
  const login = await request.post(`${API}/api/auth/login`, {
    headers: { 'x-csrf-token': token },
    data: { email: OWNER.email, password: OWNER.password },
  });
  expect(login.status()).toBe(200);
  return token;
};

test.describe('accounts', () => {
  test('a credential round-trips byte-identically through encryption', async ({ request }) => {
    const token = await freshSession(request);

    const created = await request.post(`${API}/api/overwatch-accounts`, {
      headers: { 'x-csrf-token': token },
      data: {
        accountTag: `E2E#${Date.now()}`,
        accountEmail: `e2e-${Date.now()}@example.com`,
        accountPassword: TRICKY_PASSWORD,
      },
    });
    expect(created.status()).toBe(201);
    const createdBody = await created.json();
    const accountId = createdBody.data.account.id;

    const credentials = await request.get(
      `${API}/api/overwatch-accounts/${accountId}/credentials`,
    );
    expect(credentials.status()).toBe(200);

    const body = await credentials.json();
    expect(body.success).toBe(true);
    expect(body.data.credentials.accountPassword).toBe(TRICKY_PASSWORD);

    // Clean up so repeated runs stay idempotent.
    const removed = await request.delete(`${API}/api/overwatch-accounts/${accountId}`, {
      headers: { 'x-csrf-token': token },
    });
    expect([200, 204]).toContain(removed.status());
  });

  test('the credential endpoint is rate limited', async ({ request }) => {
    const token = await freshSession(request);
    const accountId = '00000000-0000-4000-8000-000000000000';

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const response = await request.get(
        `${API}/api/overwatch-accounts/${accountId}/credentials`,
        { headers: { 'x-csrf-token': token } },
      );
      statuses.push(response.status());
      if (response.status() === 429) {
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('RATE_LIMITED');
      }
    }

    expect(statuses, `expected one 429 within 7 hits, got ${statuses.join(',')}`).toContain(429);
  });
});
