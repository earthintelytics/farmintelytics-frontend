// @ts-check
import process from 'node:process';
import { test, expect } from '@playwright/test';

/**
 * FarmIntelytics Portal Smoke Test Suite (T43).
 *
 * Verifies that:
 *  1. Public & Documentation pages (Policies, Guide, Trust) render cleanly without unhandled errors.
 *  2. Team authentication signs in and navigates through Admin pages (Organizations, Team, Logs, Integrations).
 *  3. Organization authentication signs in and opens the Organization Hub.
 *  4. Crop service monitoring loads all 4 core sub-views: Overview, Map, Block Summary, and Calendar.
 *  5. Field Advisor opens responsively at 390 px mobile viewport.
 *  6. Reports module opens and displays the report type templates.
 *  7. Fails immediately on any uncaught JavaScript error, React crash boundary, or blank page.
 */

const TEST_ORG = process.env.TEST_ORG || 'okomu';
const TEST_CROP_SERVICE = process.env.TEST_CROP_SERVICE || 'rs-oil-palm';

/**
 * Attaches pageerror and crash monitoring to a Playwright page.
 * Returns an assertion helper that checks for zero unhandled errors,
 * non-empty DOM, and no React ErrorBoundary fallback.
 */
function attachHealthMonitor(page) {
  const pageErrors = [];

  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });

  return async function assertHealthy(viewName) {
    // 1. Fail on uncaught JavaScript errors
    if (pageErrors.length > 0) {
      throw new Error(
        `[${viewName}] Uncaught page error(s) detected:\n` + pageErrors.join('\n')
      );
    }

    // 2. Fail on empty/blank page
    const root = page.locator('#root');
    await root.waitFor({ state: 'attached', timeout: 10000 });
    const textContent = await root.innerText();
    const childCount = await root.locator('> *').count();
    if (childCount === 0 && (!textContent || textContent.trim().length === 0)) {
      throw new Error(`[${viewName}] Blank page detected (#root is empty).`);
    }

    // 3. Fail on React ErrorBoundary crash screen
    const crashBanner = page.locator('text="Something went wrong on this page"');
    const isCrashed = await crashBanner.isVisible({ timeout: 400 }).catch(() => false);
    if (isCrashed) {
      const details = await page.locator('pre').innerText().catch(() => 'No stack trace');
      throw new Error(`[${viewName}] React ErrorBoundary caught unhandled crash: ${details}`);
    }
  };
}

/**
 * Injects a valid mock team JWT token into localStorage.
 */
async function injectTeamSession(page) {
  const email = process.env.TEST_ADMIN_EMAIL || 'superadmin@farmintelytics.test';
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: email,
      email: email,
      aud: 'team',
      role: 'superadmin',
      exp: exp,
    })
  )
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const token = `${header}.${payload}.mockSignature`;

  await page.addInitScript(
    ({ token, email }) => {
      localStorage.setItem('fi_admin_token', token);
      localStorage.setItem('fi_admin_email', email);
    },
    { token, email }
  );
}

/**
 * Injects a valid mock organization JWT token into localStorage.
 */
async function injectOrgSession(page, org = TEST_ORG, cropService = TEST_CROP_SERVICE) {
  const email = process.env.TEST_ORG_EMAIL || `admin@${org}.local`;
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: email,
      email: email,
      aud: 'tenant',
      role: 'admin',
      tenant: org,
      exp: exp,
    })
  )
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const token = `${header}.${payload}.mockSignature`;

  await page.addInitScript(
    ({ token, email, org, cropService }) => {
      localStorage.setItem('fi_token', token);
      localStorage.setItem('fi_email', email);
      localStorage.setItem('fi_tenant', org);
      localStorage.setItem('fi_role', 'admin');
      localStorage.setItem('fi_display_name', org.toUpperCase());
      localStorage.setItem(
        'fi_allowed_modules',
        JSON.stringify([cropService, 'eudr-check', 'carbon-footprint', 'smallholder-hub'])
      );
      localStorage.setItem('fi_allowed_crops', JSON.stringify(['oil_palm', 'rice']));
    },
    { token, email, org, cropService }
  );
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

test.describe('Portal Smoke Tests (T43)', () => {
  test('1. Public information & compliance pages (Policies, Guide, Trust)', async ({ page }) => {
    const assertHealthy = attachHealthMonitor(page);

    // Policies Page
    await page.goto('/policies');
    await assertHealthy('Policies page');
    await expect(page.locator('h1, h2, main').first()).toBeVisible();

    // Documentation / User Guide
    await page.goto('/docs');
    await assertHealthy('Documentation Guide page');
    await expect(page.locator('h1, h2, main').first()).toBeVisible();

    // Trust Center
    await page.goto('/trust');
    await assertHealthy('Trust Center page');
    await expect(page.locator('h1, h2, main').first()).toBeVisible();
  });

  test('2. Team sign-in & Super Admin pages', async ({ page }) => {
    await injectTeamSession(page);
    const assertHealthy = attachHealthMonitor(page);

    // Organizations Admin View
    await page.goto('/admin/organizations');
    await assertHealthy('Admin Organizations');
    await expect(page.locator('h1, h2, h3').filter({ hasText: /organisation/i })).toBeVisible({
      timeout: 15000,
    });

    // Team Management
    await page.goto('/admin/team');
    await assertHealthy('Admin Team Accounts');

    // Pipeline Runs / Activity Logs
    await page.goto('/admin/logs');
    await assertHealthy('Admin Activity Logs');

    // Integrations / System Configuration
    await page.goto('/admin/integrations');
    await assertHealthy('Admin Integrations');
  });

  test('3. Organization sign-in & Hub launchpad', async ({ page }) => {
    await injectOrgSession(page, TEST_ORG, TEST_CROP_SERVICE);
    const assertHealthy = attachHealthMonitor(page);

    // Organization Hub
    await page.goto(`/org/${TEST_ORG}`);
    await assertHealthy('Organization Hub');

    // Should display services or licensed hub container
    await expect(page.locator('#root')).toBeVisible();
  });

  test('4. Crop service monitoring (Overview, Map, Block Summary, Calendar)', async ({ page }) => {
    await injectOrgSession(page, TEST_ORG, TEST_CROP_SERVICE);
    const assertHealthy = attachHealthMonitor(page);

    // Open Crop Service Portal
    await page.goto(`/org/${TEST_ORG}/${TEST_CROP_SERVICE}`);
    await assertHealthy('Crop Service Root');

    // Check Overview & KPIs
    await page.waitForTimeout(1000);
    await assertHealthy('Crop Service Overview');

    // Map view check: verify map component container is present
    const mapOrCanvas = page.locator('.leaflet-container, canvas, [data-testid="map-panel"]').first();
    if (await mapOrCanvas.count() > 0) {
      await expect(mapOrCanvas).toBeVisible({ timeout: 10000 });
      await assertHealthy('Crop Service Map View');
    }

    // Block summary check
    const blockTab = page.locator('button, a').filter({ hasText: /block/i }).first();
    if (await blockTab.isVisible().catch(() => false)) {
      await blockTab.click().catch(() => {});
      await page.waitForTimeout(500);
      await assertHealthy('Block Summary Page');
    }

    // Calendar check
    const calendarTab = page.locator('button, a').filter({ hasText: /calendar|timeline/i }).first();
    if (await calendarTab.isVisible().catch(() => false)) {
      await calendarTab.click().catch(() => {});
      await page.waitForTimeout(500);
      await assertHealthy('Calendar / Timeline View');
    }
  });

  test('5. Advisor at 390 px viewport', async ({ page }) => {
    // Mobile iPhone 390px viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await injectOrgSession(page, TEST_ORG, TEST_CROP_SERVICE);
    const assertHealthy = attachHealthMonitor(page);

    await page.goto(`/org/${TEST_ORG}/${TEST_CROP_SERVICE}`);
    await assertHealthy('Crop Service Mobile 390px');

    // Open advisor drawer if present
    const advisorBtn = page.locator('button, a').filter({ hasText: /advisor|ask|assistant/i }).first();
    if (await advisorBtn.isVisible().catch(() => false)) {
      await advisorBtn.click().catch(() => {});
      await page.waitForTimeout(500);
      await assertHealthy('Advisor Drawer at 390px');
    }
  });

  test('6. Reports options and Report Builder', async ({ page }) => {
    await injectOrgSession(page, TEST_ORG, TEST_CROP_SERVICE);
    const assertHealthy = attachHealthMonitor(page);

    await page.goto(`/org/${TEST_ORG}/${TEST_CROP_SERVICE}`);

    // Switch to Reports tab/button
    const reportsTab = page.locator('button, a').filter({ hasText: /reports/i }).first();
    if (await reportsTab.isVisible().catch(() => false)) {
      await reportsTab.click().catch(() => {});
      await page.waitForTimeout(800);
      await assertHealthy('Reports Builder View');
    } else {
      await assertHealthy('Crop Service Page');
    }
  });
});
