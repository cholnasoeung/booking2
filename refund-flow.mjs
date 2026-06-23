import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Login
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  await page.fill('#login-email', 'admin@bus.com');
  await page.fill('#login-password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Go to refunds tab
  await page.goto('http://localhost:3000/admin?tab=refunds');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);

  // Step 1 - Before: pending refund visible
  await page.screenshot({ path: '/tmp/flow1-before.png' });
  console.log('Step 1: before processing');

  // Step 2 - Open detail dialog via eye icon
  await page.locator('button[title="View details"]').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/flow2-dialog-open.png' });
  console.log('Step 2: detail dialog open');

  // Step 3 - Type admin note
  await page.fill('textarea', 'TXN-REF-20260623-001 — bank transfer confirmed');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/flow3-note-added.png' });
  console.log('Step 3: admin note typed');

  // Step 4 - Click "Process $18.00" button — SweetAlert appears
  await page.locator('button:has-text("Process")').last().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/flow4-swal-confirm.png' });
  console.log('Step 4: SweetAlert confirmation shown');

  // Step 5 - Confirm the SweetAlert
  const confirmBtn = page.locator('.swal2-confirm');
  await confirmBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/flow5-after-process.png' });
  console.log('Step 5: after processing — result');

  // Step 6 - Switch to Processed tab
  await page.click('button:has-text("Processed")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/flow6-processed-tab.png' });
  console.log('Step 6: Processed tab showing refund');

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
