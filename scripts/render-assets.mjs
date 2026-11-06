// Renders the designed raster assets from HTML templates with headless Chrome:
//   src/assets/sample-report.png  (served through astro:assets as AVIF/WebP)
//   public/og.png                 (1200×630 Open Graph image)
// Run after changing the templates: node scripts/render-assets.mjs
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const font = await readFile(
  'node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2',
);
const fontFace = `@font-face{font-family:'Instrument Sans';src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');font-weight:400 700}`;

const base = `
  ${fontFace}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Instrument Sans',sans-serif;color:#14171C;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
  .muted{color:#5B6372}
  .good{background:#0C8A5B}.warn{background:#C98A04}.poor{background:#D23F31}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%}
`;

const wordmark = (color = '#14171C', h = 26) => `
  <svg height="${h}" viewBox="0 0 98 23" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1.3 2.5V20"/><circle cx="12.3" cy="14" r="6"/><circle cx="29.3" cy="14" r="6"/><path d="M35.3 8V20"/>
    <circle cx="46.3" cy="14" r="6"/><path d="M52.3 2.5V20"/><path d="M57.3 2.5V20"/><path d="M62.3 8V20"/>
    <circle cx="62.3" cy="3.2" r="1.75" fill="#0C8A5B" stroke="none"/>
    <path d="M67.3 8V20M67.3 14a6 6 0 0 1 12 0V20"/><path d="M84.3 14H96.3A6 6 0 1 0 94.54 18.24"/>
  </svg>`;

const northfold = `<span style="display:inline-flex;align-items:center;gap:9px;font-weight:700;letter-spacing:-0.03em;font-size:19px">
  <svg width="18" height="18" viewBox="0 0 16 16"><path d="M1 15 8 1l7 14H1Z" fill="none" stroke="#14171C" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 1v14" stroke="#14171C" stroke-width="1.6"/></svg>Northfold</span>`;

// ---------- Sample report: two pages of a white-label PDF on a quiet desk ----------
const trend = [3.9, 4.1, 4.0, 3.8, 4.1, 2.1, 1.9, 2.0, 1.8, 1.9, 1.9, 2.0];
const tx = (i) => 10 + (i / (trend.length - 1)) * 400;
const ty = (v) => 110 - (v / 5) * 100;
const trendPath = trend.map((v, i) => `${i ? 'L' : 'M'}${tx(i)} ${ty(v)}`).join('');

const pages = [
  ['/', '1.7 s', '120 ms', '0.02', 'good'],
  ['/pricing', '1.9 s', '140 ms', '0.03', 'good'],
  ['/services', '2.1 s', '150 ms', '0.01', 'good'],
  ['/book-online', '2.4 s', '310 ms', '0.04', 'warn'],
  ['/blog', '1.8 s', '110 ms', '0.06', 'good'],
  ['/contact', '1.6 s', '90 ms', '0.00', 'good'],
];

const report = `<!doctype html><html><head><style>${base}
  body{width:1200px;height:880px;background:#E9ECF0;display:flex;gap:40px;align-items:flex-start;justify-content:center;padding:48px}
  .page{width:540px;height:740px;background:#fff;border-radius:6px;box-shadow:0 1px 2px rgba(20,23,28,.06),0 24px 48px -20px rgba(20,23,28,.25);padding:44px 44px 36px;display:flex;flex-direction:column}
  .page>*{flex-shrink:0}
  h1{font-size:30px;letter-spacing:-0.025em;line-height:1.1;font-weight:600}
  h2{font-size:15px;font-weight:600;margin-bottom:10px}
  .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:26px}
  .tile{background:#F2F4F6;border-radius:8px;padding:14px}
  .tile b{display:block;font-size:24px;letter-spacing:-0.02em;margin-top:4px;font-weight:600}
  .small{font-size:12.5px}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  th{font-weight:400;color:#5B6372;text-align:right;padding:8px 0;font-size:12px}
  th:first-child,td:first-child{text-align:left}
  td{border-top:1px solid #E4E7EC;padding:11px 0;text-align:right}
  .foot{margin-top:auto;display:flex;justify-content:space-between;font-size:12px;color:#5B6372;border-top:1px solid #E4E7EC;padding-top:14px}
  li{list-style:none;display:flex;justify-content:space-between;border-top:1px solid #E4E7EC;padding:9px 0;font-size:13.5px}
</style></head><body>
  <section class="page">
    <div style="display:flex;justify-content:space-between;align-items:center">${northfold}<span class="small muted">October 2026</span></div>
    <p class="muted" style="margin-top:40px;font-size:14px">Brightwater Dental · brightwaterdental.com</p>
    <h1 style="margin-top:6px">Monthly speed report</h1>
    <p style="margin-top:14px;font-size:14.5px;line-height:1.55">All three Core Web Vitals passed on mobile and desktop this month. Mobile LCP improved by 2.2 s after we compressed the pricing page hero image on October 6.</p>
    <div class="tiles">
      <div class="tile"><span class="small muted"><i class="dot good"></i> LCP · mobile</span><b>1.9 s</b><span class="small" style="color:#08754C">−2.2 s vs Sept</span></div>
      <div class="tile"><span class="small muted"><i class="dot good"></i> INP · mobile</span><b>140 ms</b><span class="small" style="color:#08754C">−180 ms vs Sept</span></div>
      <div class="tile"><span class="small muted"><i class="dot good"></i> CLS · mobile</span><b>0.03</b><span class="small" style="color:#08754C">−0.08 vs Sept</span></div>
    </div>
    <h2 style="margin-top:28px">Mobile LCP, last 12 weeks</h2>
    <svg width="452" height="122" viewBox="0 0 420 122">
      <line x1="10" x2="410" y1="${ty(2.5)}" y2="${ty(2.5)}" stroke="#C4CAD3" stroke-dasharray="4 4"/>
      <text x="410" y="${ty(2.5) - 6}" text-anchor="end" font-size="11" fill="#5B6372">Good up to 2.5 s</text>
      <line x1="10" x2="410" y1="110" y2="110" stroke="#E4E7EC"/>
      <path d="${trendPath}" fill="none" stroke="#14171C" stroke-width="2"/>
      <circle cx="${tx(5)}" cy="${ty(2.1)}" r="4.5" fill="#0C8A5B" stroke="#fff" stroke-width="2"/>
      <text x="${tx(5) + 10}" y="${ty(2.1) + 26}" font-size="11.5" fill="#14171C" font-weight="600">Image fix shipped</text>
    </svg>
    <h2 style="margin-top:22px">Fixed this month</h2>
    <ul>
      <li><span>Compressed hero image on /pricing</span><span class="muted">LCP −2.2 s</span></li>
      <li><span>Deferred the chat widget until first scroll</span><span class="muted">INP −180 ms</span></li>
    </ul>
    <div class="foot"><span>Prepared by Northfold Studio</span><span>Page 1 of 4</span></div>
  </section>
  <section class="page" style="margin-top:28px">
    <div style="display:flex;justify-content:space-between;align-items:center">${northfold}<span class="small muted">October 2026</span></div>
    <h1 style="margin-top:40px;font-size:24px">Page by page</h1>
    <p class="muted" style="margin-top:6px;font-size:14px">Mobile, median of daily checks</p>
    <table style="margin-top:18px">
      <thead><tr><th>Page</th><th>LCP</th><th>INP</th><th>CLS</th><th style="width:96px">Status</th></tr></thead>
      <tbody>${pages
        .map(
          ([p, l, i, c, s]) =>
            `<tr><td>${p}</td><td>${l}</td><td>${i}</td><td>${c}</td><td><i class="dot ${s}"></i>&nbsp; ${s === 'good' ? 'Good' : 'Needs work'}</td></tr>`,
        )
        .join('')}</tbody>
    </table>
    <h2 style="margin-top:30px">Watching next month</h2>
    <p style="font-size:14.5px;line-height:1.55">The booking widget adds 310 ms of script to every tap on /book-online. We’ll test a lighter embed in November and report the result here.</p>
    <h2 style="margin-top:26px">Uptime of checks</h2>
    <p style="font-size:14.5px;line-height:1.55">31 of 31 daily checks completed. 186 page loads measured on mobile and desktop.</p>
    <div class="foot"><span>hello@northfold.studio</span><span>Page 2 of 4</span></div>
  </section>
</body></html>`;

// ---------- Open Graph image ----------
const bar = (label, value, status, pos, goodEnd, warnEnd) => `
  <div style="margin-top:22px">
    <div style="display:flex;align-items:baseline;gap:12px;font-size:19px">
      <b style="width:48px;font-weight:600">${label}</b>
      <span style="flex:1"></span>
      <b style="font-size:24px;font-weight:600;letter-spacing:-0.02em">${value}</b>
      <span style="width:118px;text-align:right;color:${status === 'good' ? '#08754C' : status === 'warn' ? '#8F6200' : '#B5332A'}">${status === 'good' ? 'Good' : status === 'warn' ? 'Needs work' : 'Poor'}</span>
    </div>
    <div style="position:relative;height:8px;margin-top:12px">
      <div style="position:absolute;inset:0;display:flex;gap:3px;border-radius:99px;overflow:hidden">
        <span style="width:${goodEnd}%;background:rgba(12,138,91,.18)"></span>
        <span style="width:${warnEnd - goodEnd}%;background:rgba(201,138,4,.22)"></span>
        <span style="flex:1;background:rgba(210,63,49,.18)"></span>
      </div>
      <div class="${status}" style="position:absolute;left:0;top:0;bottom:0;width:${pos}%;border-radius:99px"></div>
      <div class="${status}" style="position:absolute;left:${pos}%;top:50%;width:18px;height:18px;border-radius:50%;border:4px solid #fff;transform:translate(-50%,-50%)"></div>
    </div>
  </div>`;

const og = `<!doctype html><html><head><style>${base}
  body{width:1200px;height:630px;background:#F7F8FA;padding:64px 72px;display:flex;gap:64px;align-items:center;position:relative}
</style></head><body>
  <div style="flex:1">
    ${wordmark('#14171C', 34)}
    <h1 style="margin-top:44px;font-size:64px;line-height:1.02;letter-spacing:-0.035em;font-weight:600">Know when a client’s site gets slow. Before they do.</h1>
    <p class="muted" style="margin-top:26px;font-size:24px;line-height:1.4">Daily Core Web Vitals monitoring and white-label speed reports for web agencies.</p>
  </div>
  <div style="width:430px;background:#fff;border:1px solid #DDE1E7;border-radius:16px;box-shadow:0 24px 48px -24px rgba(20,23,28,.25);padding:28px 30px 32px">
    <div style="display:flex;justify-content:space-between;font-size:17px"><b style="font-weight:600">clientsite.com</b><span class="muted">Mobile, 4G</span></div>
    <div style="height:1px;background:#DDE1E7;margin-top:18px"></div>
    ${bar('LCP', '3.2 s', 'warn', 53, 41.7, 66.7)}
    ${bar('INP', '140 ms', 'good', 17.5, 25, 62.5)}
    ${bar('CLS', '0.02', 'good', 5, 25, 62.5)}
    <div style="margin-top:26px;background:#F2F4F6;border-radius:10px;padding:14px 16px;font-size:16px">
      <span class="muted">Likely cause</span><br/><b style="font-weight:600">Hero image grew to 2.4 MB on /pricing</b>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });

const reportPage = await browser.newPage({ viewport: { width: 1200, height: 880 }, deviceScaleFactor: 2 });
await reportPage.setContent(report, { waitUntil: 'load' });
await reportPage.evaluate(() => document.fonts.ready);
await reportPage.screenshot({ path: 'src/assets/sample-report.png' });

const ogPage = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await ogPage.setContent(og, { waitUntil: 'load' });
await ogPage.evaluate(() => document.fonts.ready);
await ogPage.screenshot({ path: 'public/og.png' });

await browser.close();
console.log('Rendered src/assets/sample-report.png and public/og.png');
