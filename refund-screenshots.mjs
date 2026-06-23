import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  await page.fill('#login-email', 'admin@bus.com');
  await page.fill('#login-password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:3000/admin?tab=refunds');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  // Shot 1: main overview (pending tab)
  await page.screenshot({ path: '/tmp/ref1-overview.png' });
  console.log('Shot 1: overview');
  // Shot 2: open detail dialog
  const eyeBtn = page.locator('button[title="View details"]').first();
  await eyeBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/ref2-dialog.png' });
  console.log('Shot 2: detail dialog');
  // Shot 3: type admin note
  await page.fill('textarea', 'TXN-20260623-001 processed via bank transfer');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/ref3-with-note.png' });
  console.log('Shot 3: with note filled');
  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
