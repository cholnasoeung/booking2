const { chromium } = require('playwright');

(async () => {
  const BASE = 'http://localhost:3000';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);

  // Log in
  await page.goto(`${BASE}/login`);
  await page.locator('input[type="email"]').fill('admin@bus.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/admin|dashboard/, { timeout: 12000 });

  // Open dialog
  await page.goto(`${BASE}/admin?tab=buses`);
  await page.waitForSelector('text=Bus Departures', { timeout: 10000 });
  await page.click('button:has-text("Add Bus")');
  await page.waitForSelector('text=Add New Bus', { timeout: 8000 });

  // Set same date/time as existing buses (2026-06-22 08:00-14:00)
  // Pick Phnom Penh→Siem Reap (same route as existing) but a DIFFERENT vehicle + driver
  await page.locator('#bus-date').fill('2026-06-22');
  await page.locator('#bus-departure').fill('08:00');
  await page.locator('#bus-arrival').fill('14:00');
  await page.locator('#bus-arrival').blur();
  await page.waitForTimeout(2000);

  // Check that warnings show (1 vehicle + 1 driver busy)
  const warnings = await page.locator('p').allTextContents();
  const relevant = warnings.filter(t => t.includes('unavailable') || t.includes('free'));
  console.log('WARNINGS:', JSON.stringify(relevant));

  // The second vehicle ("test · 123123") should still be selectable
  const cbTexts = await page.locator('button[role="combobox"]').allTextContents();
  const vehicleIdx = cbTexts.findIndex(t => t.includes('Select a bus') || t.includes('leave blank'));
  await page.locator('button[role="combobox"]').nth(vehicleIdx).click();
  await page.waitForTimeout(600);

  // Select "test · 123123" (the non-busy vehicle)
  await page.locator('[role="option"]:not([data-disabled])').filter({ hasText: 'test' }).first().click();
  await page.waitForTimeout(400);
  console.log('SELECTED free vehicle');

  // Select free driver: "test · 123123213"
  await page.locator('#bus-driver').click();
  await page.waitForTimeout(600);
  await page.locator('[role="option"]:not([data-disabled])').filter({ hasText: 'test' }).first().click();
  await page.waitForTimeout(400);
  console.log('SELECTED free driver');

  // Set price
  await page.locator('#bus-price').fill('20');

  // Submit — should succeed (different vehicle + driver, same time is now allowed)
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/admin/buses') && r.request().method() === 'POST', { timeout: 10000 }),
    page.click('button[type="submit"]')
  ]);
  const body = await response.json().catch(() => null);
  console.log('API RESPONSE status:', response.status());
  console.log('API RESPONSE body:', JSON.stringify(body));

  // Screenshot final state
  await page.screenshot({ path: 'verify-multi-result.png' });

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
