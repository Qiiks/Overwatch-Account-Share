import { test, expect } from '@playwright/test';

/**
 * Browser flows against the real stack. Needs the dev seed (ALLOW_DEV_SEED=1 node
 * server/scripts/seed-dev.js) — the register test flips the registration setting off/on
 * and needs an admin, so it is skipped unless ADMIN_EMAIL/ADMIN_PASSWORD are provided.
 */
const OWNER = {
  email: process.env.SMOKE_EMAIL || 'dev-owner@example.com',
  password: process.env.SMOKE_PASSWORD || 'DevPassw0rd!',
};
const ADMIN = {
  email: process.env.ADMIN_EMAIL || '',
  password: process.env.ADMIN_PASSWORD || '',
};
const API = process.env.E2E_API_BASE_URL || 'http://localhost:5001';

test.describe('auth', () => {
  test('login sets an httpOnly cookie and stores no session in localStorage', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', OWNER.email);
    await page.fill('input[type="password"]', OWNER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/dashboard/);

    const localKeys = await page.evaluate(() => Object.keys(window.localStorage));
    expect(localKeys.filter((key) => /auth|token|user|admin/i.test(key))).toEqual([]);

    const cookies = await page.context().cookies();
    const auth = cookies.find((cookie) => cookie.name === 'auth_token');
    expect(auth, 'auth_token cookie must be set').toBeTruthy();
    expect(auth!.httpOnly).toBe(true);

    // JavaScript cannot read either cookie.
    const visibleCookies = await page.evaluate(() => document.cookie);
    expect(visibleCookies).not.toContain('auth_token');
    expect(visibleCookies).not.toContain('csrf-token');
  });

  test('a wrong password shows the server message and stays on the page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', OWNER.email);
    await page.fill('input[type="password"]', 'definitely-not-the-password');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected routes redirect anonymous visitors to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await page.goto('/accounts');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout clears the session and re-guards the app', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', OWNER.email);
    await page.fill('input[type="password"]', OWNER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 20_000 });

    await page.getByRole('button', { name: /log\s*out/i }).first().click();
    await page.waitForURL('**/login', { timeout: 15_000 });

    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === 'auth_token')).toBeFalsy();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('registration can be toggled off and back on by an admin', async ({ page, request }) => {
    test.skip(!ADMIN.email || !ADMIN.password, 'ADMIN_EMAIL/ADMIN_PASSWORD not provided');

    // Sign in as admin through the API, then flip the setting via the API.
    const csrf = await request.get(`${API}/api/auth/csrf`);
    const token = (await csrf.json()).data.token as string;
    await request.post(`${API}/api/auth/login`, {
      headers: { 'x-csrf-token': token },
      data: { email: ADMIN.email, password: ADMIN.password },
    });

    const off = await request.post(`${API}/api/admin/toggle-registrations`, {
      headers: { 'x-csrf-token': token },
      data: { enabled: false },
    });
    expect(off.status()).toBe(200);
    expect((await off.json()).data.enabled).toBe(false);

    await page.goto('/register');
    // Text, not role: GlassCardTitle renders a <div> (client/components/ui/GlassCard.tsx:39),
    // so a heading locator would match nothing. The body says "currently disabled", so this
    // exact string can only be the title.
    await expect(page.getByText('Registration closed', { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    const on = await request.post(`${API}/api/admin/toggle-registrations`, {
      headers: { 'x-csrf-token': token },
      data: { enabled: true },
    });
    expect(on.status()).toBe(200);
    expect((await on.json()).data.enabled).toBe(true);
  });
});
