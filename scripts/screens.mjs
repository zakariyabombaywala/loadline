// QA helper: screenshots the page at the breakpoints from the brief, in light and dark,
// and reports horizontal overflow and console errors.
// Usage: node scripts/screens.mjs <url> <outDir> [--demo] [--selector=#pricing] [--themes=light,dark]
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const [url = 'http://localhost:4321/', outDir = 'screens', ...flags] = process.argv.slice(2);
const opt = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.split('=')[1];
const runDemo = flags.includes('--demo');
const selector = opt('selector');
const widths = (opt('widths') ?? '360,768,1024,1440').split(',').map(Number);
const themes = (opt('themes') ?? 'light,dark').split(',');

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });

for (const theme of themes) {
  for (const width of widths) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      colorScheme: theme,
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(url, { waitUntil: 'networkidle' });
    // Full-page captures paint beyond the viewport without scrolling, so content-visibility
    // would (correctly) leave below-the-fold sections unpainted. Force them on for QA.
    await page.addStyleTag({ content: '.defer-render{content-visibility:visible!important}' });

    if (runDemo) {
      await page.getByRole('button', { name: 'Check speed' }).click();
      await page.waitForTimeout(2600);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const offenders =
      overflow > 0
        ? await page.evaluate(() =>
            [...document.querySelectorAll('body *')]
              .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !el.closest('astro-dev-toolbar'))
              .slice(0, 6)
              .map((el) => `    ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 70)} → right ${Math.round(el.getBoundingClientRect().right)}`),
          )
        : [];
    const file = path.join(outDir, `${selector ? selector.replace(/\W/g, '') + '-' : ''}${width}-${theme}.png`);

    if (selector) {
      await page.locator(selector).screenshot({ path: file });
    } else {
      await page.screenshot({ path: file, fullPage: true });
    }

    console.log(
      `${theme.padEnd(5)} ${String(width).padStart(4)}px  overflow:${overflow > 0 ? ` ${overflow}px ✗` : ' none'}  errors:${errors.length ? ' ' + errors.join(' | ') : ' none'}`,
    );
    if (offenders.length) console.log(offenders.join('\n'));
    await page.close();
  }
}

await browser.close();
