import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Account + credential behaviour against the real API. The round-trip test is the one that
 * proves the HTML-escaping-before-encryption bug stays fixed: a password containing
 * ' & < > # must come back byte-identical.
 *
 * The rate-limit case deliberately spends the per-IP credential budget (5/min, shared with
 * /all-public and /:id/credentials), so a second full run inside the same minute 429s the
 * round-trip above — observed in the API's own log, not theorised. The limiter's store is in
 * memory: restart the API or wait out the window between runs. The budget is deliberately not
 * raised for tests, since this case asserts the real limit.
 */
const API = process.env.E2E_API_BASE_URL || 'http://localhost:5001';
const OWNER = {
  email: process.env.SMOKE_EMAIL || 'dev-owner@example.com',
  password: process.env.SMOKE_PASSWORD || 'DevPassw0rd!',
};

const TRICKY_PASSWORD = "p'a&<b>#1";

/**
 * Safety net the per-test `finally` cannot give: a worker crash, a timeout or an interrupted
 * run leaves its row behind, and this database is the owner's production project.
 * `accountEmail` is plaintext in the list projection, so an `e2e-…` address is unambiguously
 * ours (the owner's rows carry their real addresses). The list route has no credential
 * limiter, so this cannot 429 however much budget a test spent.
 */
test.afterAll(async ({ request }) => {
  const csrf = await request.get(`${API}/api/auth/csrf`);
  const token = (await csrf.json()).data?.token as string | undefined;
  const login = await request.post(`${API}/api/auth/login`, {
    headers: { 'x-csrf-token': token || '' },
    data: { email: OWNER.email, password: OWNER.password },
  });
  if (login.status() !== 200) return; // cannot authenticate ⇒ nothing to sweep

  const list = await request.get(`${API}/api/overwatch-accounts`);
  if (list.status() !== 200) return;

  const rows = (await list.json()).data;
  if (!Array.isArray(rows)) return;

  const mine = rows.filter((row) => /^e2e-/i.test(String(row.accountEmail)));
  for (const row of mine) {
    await request.delete(`${API}/api/overwatch-accounts/${row.id}`, {
      headers: { 'x-csrf-token': token || '' },
    });
  }
  if (mine.length > 0) {
    console.log(`[cleanup] removed ${mine.length} stranded fixture row(s)`);
  }
});

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

    // The row exists from here on, so its removal belongs in a finally: when the credentials
    // call below answered 429 the test aborted before the old trailing delete and left a
    // fixture account — encrypted under whatever key this run used — in the live project.
    try {
      const credentials = await request.get(
        `${API}/api/overwatch-accounts/${accountId}/credentials`,
      );
      expect(credentials.status()).toBe(200);

      const body = await credentials.json();
      expect(body.success).toBe(true);
      expect(body.data.accountPassword).toBe(TRICKY_PASSWORD);
    } finally {
      const removed = await request.delete(`${API}/api/overwatch-accounts/${accountId}`, {
        headers: { 'x-csrf-token': token },
      });
      expect([200, 204]).toContain(removed.status());
    }
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

    // Same as the round-trip: the row exists, so its removal is in a finally. The live project
    // is the owner's, and a failed assertion must not leave a fixture behind.
    try {
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
    } finally {
      const removed = await request.delete(`${API}/api/overwatch-accounts/${accountId}`, {
        headers: { 'x-csrf-token': token },
      });
      expect([200, 204]).toContain(removed.status());
    }
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
