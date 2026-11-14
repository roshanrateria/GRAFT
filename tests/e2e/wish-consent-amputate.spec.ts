import { test, expect } from '@playwright/test';

test.describe('GRAFT E2E: Ledger and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('wish input is visible and functional', async ({ page }) => {
    // Check that wish input exists
    const wishInput = page.locator('[data-testid="wish-input"]');
    await expect(wishInput).toBeVisible();
    
    // Type a wish
    await wishInput.fill('Show my task count');
    await expect(wishInput).toHaveValue('Show my task count');
    
    // Submit button exists
    const submitBtn = page.locator('[data-testid="wish-submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test('ledger panel is visible', async ({ page }) => {
    // Chart panel (ledger) is visible
    const chartPanel = page.locator('[data-testid="nav-ledger"]');
    await expect(chartPanel).toBeVisible();
    
    // Wait for ledger entries to load
    await page.waitForSelector('[data-testid="ledger-entry"]', { timeout: 10000 });
    
    // Ledger entries are displayed (mock data)
    const entries = page.locator('[data-testid="ledger-entry"]');
    const count = await entries.count();
    expect(count).toBeGreaterThan(0);
  });

  test('ledger hash chain integrity display', async ({ page }) => {
    // Wait for ledger to load
    await page.waitForSelector('[data-testid="ledger-entry"]', { timeout: 10000 });
    
    // Get all entries
    const entries = await page.locator('[data-testid="ledger-entry"]').all();
    expect(entries.length).toBeGreaterThan(0);
    
    // Verify each entry has hash
    for (const entry of entries) {
      const hash = await entry.locator('[data-testid="entry-hash"]').textContent();
      expect(hash).toBeTruthy();
      expect(hash!.length).toBeGreaterThan(5); // At least "xxxx..."
    }
    
    // Click verify button
    const verifyBtn = page.locator('button:has-text("Verify chain")');
    await verifyBtn.click();
    
    // Wait for verification result
    const chainValidation = page.locator('[data-testid="chain-validation"]');
    await expect(chainValidation).toBeVisible({ timeout: 5000 });
    const text = await chainValidation.textContent();
    expect(text).toContain('Chain valid');
  });

  test('organ slots are displayed', async ({ page }) => {
    // Check that slot grid exists
    const slotGrid = page.locator('[role="grid"]');
    await expect(slotGrid).toBeVisible();
    
    // Check that empty slots are displayed
    const emptySlots = page.locator('.organ-slot--empty');
    const count = await emptySlots.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('GRAFT E2E: Doctor API', () => {
  test('doctor status endpoint returns live mode', async ({ request }) => {
    // Test the Doctor API directly using Playwright's request context
    const response = await request.get('http://localhost:3000/api/doctor/status');
    const data = await response.json();
    
    // Should be in passcode-protected mode with LIVE_PASSCODE set
    expect(data.mode).toBe('passcode-protected');
    expect(data.canGoLive).toBe(true);
    expect(data.dailyWishesRemaining).toBe(50);
  });

  test('authenticate with passcode for live mode', async ({ request }) => {
    // Authenticate with the test passcode
    const authResponse = await request.post('http://localhost:3000/api/doctor/live', {
      headers: { 'Content-Type': 'application/json' },
      data: { passcode: 'test' }
    });
    
    expect(authResponse.status()).toBe(200);
    const authData = await authResponse.json();
    expect(authData.success).toBe(true);
    expect(authData.sessionToken).toBeDefined();
    expect(authData.expiresAt).toBeGreaterThan(Date.now());
  });

  test('wish submission with live mode', async ({ request }) => {
    // First authenticate
    const authResponse = await request.post('http://localhost:3000/api/doctor/live', {
      headers: { 'Content-Type': 'application/json' },
      data: { passcode: 'test' }
    });
    const authData = await authResponse.json();
    const sessionToken = authData.sessionToken;

    // Submit a wish with session token. Live wishes stream over SSE - the
    // pipeline (spec -> build -> immune -> consent) runs as doctor-events.
    const wishResponse = await request.post('http://localhost:3000/api/doctor/wish', {
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      data: {
        wish: 'Add a simple task counter',
        sessionToken
      }
    });

    expect(wishResponse.status()).toBe(200);
    expect(wishResponse.headers()['content-type']).toContain('text/event-stream');
    // The stream is aborted when this test ends; the server stops writing.
  });

  test('wish submission in replay mode', async ({ page }) => {
    await page.goto('/');
    
    // Fill wish input
    const wishInput = page.locator('[data-testid="wish-input"]');
    await wishInput.fill('Add a mood tracker widget');
    
    // Click submit
    const submitBtn = page.locator('[data-testid="wish-submit"]');
    await submitBtn.click();
    
    // Wait for response (replay mode will show message)
    // The DoctorNotes component should show assumptions after submission
    await page.waitForTimeout(1000);
  });

  test('full page load and UI structure', async ({ page }) => {
    await page.goto('/');
    
    // All major UI sections should be visible
    await expect(page.locator('[data-testid="wish-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-ledger"]')).toBeVisible();
    await expect(page.locator('[role="grid"]')).toBeVisible();
    
    // Title should be present
    await expect(page.locator('text="Doctor\'s Notes"')).toBeVisible();
    await expect(page.locator('text="The Chart"')).toBeVisible();
    
    // Passcode input should be visible (live mode available)
    const passcodeInput = page.locator('#passcode-input');
    await expect(passcodeInput).toBeVisible();
  });
});
