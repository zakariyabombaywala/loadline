// Functional smoke test of the interactive parts against a running build.
// Usage: node scripts/smoke.mjs [url]
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:4321/';
const browser = await chromium.launch({ channel: 'chrome' });
let failures = 0;

async function test(name, fn, contextOptions = {}) {
  const { allow404, ...browserOptions } = contextOptions;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...browserOptions });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  try {
    await fn(page);
    const real = errors.filter((e) => !(allow404 && e.includes('404')));
    if (real.length) throw new Error(`console errors: ${real.join(' | ')}`);
    console.log(`✓ ${name}`);
  } catch (err) {
    failures++;
    console.log(`✗ ${name}\n    ${err.message.split('\n')[0]}`);
  }
  await ctx.close();
}

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const liveText = (page) => page.locator('[aria-live="polite"][aria-atomic="true"]').innerText();

await test('no framework JS loads before interaction', async (page) => {
  const scripts = [];
  page.on('request', (r) => r.resourceType() === 'script' && scripts.push(r.url()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  expect(scripts.length === 0, `scripts requested on load: ${scripts.map((s) => s.split('/').pop()).join(', ')}`);
});

await test('first click on "Check speed" hydrates and runs the scan', async (page) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Check speed' }).click();
  await page.getByText('Likely cause').first().waitFor();
  await page.waitForFunction(() => document.querySelector('[aria-live="polite"][aria-atomic="true"]')?.textContent?.includes('Results for clientsite.com'), null, { timeout: 4000 });
  expect(page.url() === url, `page navigated to ${page.url()}`);
});

await test('slow network: a tap before React is ready is held and replayed', async (page) => {
  await page.route('**/_astro/*.js', async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.continue();
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.getByLabel('Site address').fill('slow-network.com');
  await page.getByRole('button', { name: 'Check speed' }).tap();
  await page.waitForFunction(() => document.querySelector('[aria-live="polite"][aria-atomic="true"]')?.textContent?.includes('Results for slow-network.com'), null, { timeout: 8000 });
  expect(page.url() === url, `page navigated to ${page.url()}`);
}, { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

await test('keyboard only: Tab to the field, type a URL, press Enter', async (page) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  const input = page.getByLabel('Site address');
  for (let i = 0; i < 20 && !(await input.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  expect(await input.evaluate((el) => el === document.activeElement), 'could not reach the input with Tab');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('https://www.Acme.io/pricing');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[aria-live="polite"][aria-atomic="true"]')?.textContent?.includes('Results for acme.io'), null, { timeout: 4000 });
});

await test('same URL always gives the same result', async (page) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  const run = async () => {
    await page.getByRole('button', { name: /Check speed/ }).click();
    await page.waitForFunction(() => document.querySelector('[aria-live="polite"][aria-atomic="true"]')?.textContent?.startsWith('Results'), null, { timeout: 4000 });
    const t = await liveText(page);
    return t;
  };
  const a = await run();
  await page.waitForTimeout(200);
  const b = await run();
  expect(a === b, `results differ:\n${a}\n${b}`);
});

await test('prefers-reduced-motion skips the scan animation', async (page) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  // Hydrate first so the timing below measures only the scan.
  await page.getByLabel('Site address').focus();
  await page.waitForTimeout(800);
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Check speed' }).click();
  await page.waitForFunction(() => document.querySelector('[aria-live="polite"][aria-atomic="true"]')?.textContent?.startsWith('Results'), null, { timeout: 4000 });
  expect(Date.now() - t0 < 700, `took ${Date.now() - t0} ms; expected an instant result`);
}, { reducedMotion: 'reduce' });

await test('invalid input shows a labelled error', async (page) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  const input = page.getByLabel('Site address');
  await input.focus();
  await page.waitForTimeout(800);
  await input.fill('not a site');
  await page.getByRole('button', { name: 'Check speed' }).click();
  await page.getByRole('alert').filter({ hasText: 'Enter a site address' }).waitFor({ timeout: 2000 });
  expect((await input.getAttribute('aria-invalid')) === 'true', 'aria-invalid not set');
});

await test('pricing: yearly toggle and site slider', async (page) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('#pricing').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.locator('#pricing label').filter({ hasText: 'Yearly' }).click();
  const agency = page.locator('#pricing li').filter({ has: page.getByRole('heading', { name: 'Agency' }) });
  await agency.getByText('$66').waitFor({ timeout: 2000 });
  await agency.getByText('$790 billed yearly').waitFor();
  const slider = page.getByLabel('How many sites do you manage?');
  await slider.focus();
  await slider.fill('120');
  await page.getByText('Scale fits you, with room for up to 200 sites.').waitFor({ timeout: 2000 });
  await slider.press('Home');
  await page.getByText('Starter fits you, with room for up to 10 sites.').waitFor({ timeout: 2000 });
});

await test('mobile menu opens, closes on Escape and returns focus', async (page) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  const toggle = page.getByRole('button', { name: 'Menu' });
  await toggle.click();
  expect((await toggle.getAttribute('aria-expanded')) === 'true', 'menu did not open');
  await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Pricing' }).waitFor();
  await page.keyboard.press('Escape');
  expect((await toggle.getAttribute('aria-expanded')) === 'false', 'menu did not close');
  expect(await toggle.evaluate((el) => el === document.activeElement), 'focus not returned to the menu button');
}, { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });

await test('FAQ answers open without JavaScript', async (page) => {
  await page.goto(url, { waitUntil: 'load' });
  await page.getByText('How do alerts work?').click();
  await page.getByText('7-day baseline').first().waitFor({ timeout: 2000 });
}, { javaScriptEnabled: false });

await test('404 page renders with a way home', async (page) => {
  const res = await page.goto(new URL('/signup', url).href);
  expect(res.status() === 404, `status ${res.status()}`);
  await page.getByRole('heading', { name: 'This page isn’t live.' }).waitFor();
  await page.getByRole('link', { name: 'Back to the homepage' }).waitFor();
}, { allow404: true });

await browser.close();
console.log(failures ? `\n${failures} failed` : '\nAll passed');
process.exit(failures ? 1 : 0);
