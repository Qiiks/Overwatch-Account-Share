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
    const accountId = createdBody.data.id;

    const credentials = await request.get(
      `${API}/api/overwatch-accounts/${accountId}/credentials`,
    );
    expect(credentials.status()).toBe(200);

    const body = await credentials.json();
    expect(body.success).toBe(true);
    expect(body.data.accountPassword).toBe(TRICKY_PASSWORD);

    // Clean up so repeated runs stay idempotent.
    const removed = await request.delete(`${API}/api/overwatch-accounts/${accountId}`, {
      headers: { 'x-csrf-token': token },
    });
    expect([200, 204]).toContain(removed.status());
  });

  test('the account list answers 200 and ships no credential ciphertext', async ({ request }) => {
    const token = await freshSession(request);
    expect(token).toBeTruthy();

    // Create a row of our own first: on an unseeded database the loop below would otherwise
    // iterate an empty array and assert nothing, which is how this route had no coverage at all.
    const tag = `E2E-LIST#${Date.now()}`;
    const created = await request.post(`${API}/api/overwatch-accounts`, {
      headers: { 'x-csrf-token': token },
      data: {
        accountTag: tag,
        accountEmail: `e2e-list-${Date.now()}@example.com`,
        accountPassword: TRICKY_PASSWORD,
      },
    });
    expect(created.status()).toBe(201);
    const accountId = (await created.json()).data.id as string;

    // The bare GET must answer from its own query, not from whatever a previous request left
    // behind: the original defect (an implicit global) served the earlier caller's filtered
    // rows here, so a filtered miss must not narrow the unfiltered list.
    const missed = await request.get(
      `${API}/api/overwatch-accounts?search=${encodeURIComponent(`no-such-tag-${Date.now()}`)}`,
    );
    expect(missed.status()).toBe(200);
    expect((await missed.json()).data).toEqual([]);

    // Every other account surface is covered elsewhere; this route had no test at all, which
    // is how it shipped a 500 on the bare call (an undeclared variable) plus the raw table row.
    const list = await request.get(`${API}/api/overwatch-accounts`);
    expect(list.status()).toBe(200);

    const body = await list.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    const rows = body.data as Record<string, unknown>[];
    const mine = rows.find((row) => row.id === accountId);
    expect(mine, 'the account just created must appear in the list').toBeTruthy();

    for (const row of rows) {
      expect(row).not.toHaveProperty('accountpassword');
      expect(row).not.toHaveProperty('accounttag');
      expect(row).not.toHaveProperty('normalized_account_email');
      expect(row).not.toHaveProperty('password_encryption_type');
      expect(row).toHaveProperty('accountTag');
      expect(row).toHaveProperty('otpExpiresAt');
    }

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
