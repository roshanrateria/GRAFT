/**
 * GRAFT E2E: Live Doctor pipeline (NVIDIA LLM)
 *
 * Exercises the full live wish flow through the real UI against the real
 * Doctor provider:
 *   passcode auth -> wish submit -> SSE spec stream -> build -> immune ->
 *   consent dialog -> transplant -> organ installed + ledger entry
 *
 * Requires both dev servers running (playwright webServer starts them):
 * - web on :3000 (vite proxies /api to :3001)
 * - server on :3001 with DOCTOR_PROVIDER=llm and the NVIDIA API key in env
 *
 * Rate limits: the hourly live-wish quota is 10, so this suite intentionally
 * runs a single full-flow wish.
 */

import { test, expect } from '@playwright/test';

// LLM generation (spec + build) can take a couple of minutes; be generous.
test.setTimeout(420_000);

test.describe('GRAFT E2E: Live Doctor full flow', () => {
  test('passcode -> wish -> spec stream -> consent dialog -> transplant', async ({ page }) => {
    await page.goto('/');

    // ------------------------------------------------------------------
    // 1. Authenticate for live mode through the UI
    // ------------------------------------------------------------------
    const passcodeInput = page.locator('#passcode-input');
    await expect(passcodeInput).toBeVisible();
    await passcodeInput.fill('test');
    await passcodeInput.press('Enter');

    // The LIVE badge appears once the session token is stored
    await expect(page.locator('.doctor-notes__live-badge')).toHaveText('LIVE', {
      timeout: 20_000,
    });

    // ------------------------------------------------------------------
    // 2. Submit a wish
    // ------------------------------------------------------------------
    const wishInput = page.locator('[data-testid="wish-input"]');
    await expect(wishInput).toBeVisible();
    await wishInput.fill('Add a small task counter widget that shows how many open tasks I have');
    await page.locator('[data-testid="wish-submit"]').click();

    // ------------------------------------------------------------------
    // 3. The spec streams in over SSE (assumption -> spec sections)
    // ------------------------------------------------------------------
    const specArea = page.locator('[data-testid="spec-status"]');
    await expect(specArea).not.toContainText('Spec will appear here...', {
      timeout: 300_000,
    });
    // Some streamed spec content mentioning the organ's subject matter
    await expect(specArea).toContainText(/task|count/i, { timeout: 60_000 });

    // ------------------------------------------------------------------
    // 4. Consent dialog arrives after build + immune system pass
    // ------------------------------------------------------------------
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 300_000 });

    // The dialog summarises the organ and its permissions
    await expect(dialog).toContainText(/task|counter/i, { timeout: 15_000 });
    const transplantButton = dialog.getByRole('button', { name: 'Transplant' });
    await expect(transplantButton).toBeVisible();

    // ------------------------------------------------------------------
    // 5. Approve the transplant (browser re-runs the immune system first)
    // ------------------------------------------------------------------
    await transplantButton.click();

    // Success confirms the ledger entry id appended during transplant
    const status = page.locator('[data-testid="transplant-status"]');
    await expect(status).toContainText('Transplanted', { timeout: 180_000 });
    await expect(status).toContainText('entry', { timeout: 15_000 });
  });
});
