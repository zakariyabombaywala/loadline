# Loadline

Landing page for **Loadline**, a fictional SaaS product that monitors website speed for web agencies.
It's a portfolio concept: designed and built to the standard of a funded company's marketing site, and
to prove three things at once: visual design, Astro and React engineering, and performance.

> Loadline checks every client site an agency manages each day, alerts them in Slack or email when
> Core Web Vitals regress (with the likely cause), and produces white-label monthly speed reports.

Designed and built by [Muhammad Zakariya](https://portfolio.zakariyabombaywala.workers.dev/).

---

## Results

| | |
| --- | --- |
| **Lighthouse (mobile)** | Performance **97** (median of 5) · Accessibility **100** · Best Practices **100** · SEO **100** |
| **Largest Contentful Paint** | **1.4 s** in every run |
| **Cumulative Layout Shift** | **0** in every run |
| **JavaScript on page load** | **2.4 KB** gzip, inline. No framework code |
| **JavaScript after interaction** | 72.9 KB gzip (React 19 runtime 65.7 KB + both islands 5.5 KB), loaded on demand |
| **Page weight on load** | 59 KB total (HTML with inlined CSS 24 KB gzip, one font file 29 KB) |

### How these were measured

Lighthouse 12.8.2, default mobile config (Moto G Power emulation, simulated slow 4G, 4× CPU slowdown),
against `pnpm preview` of the production build.

| Run | Performance | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 97 | 1.2 s | 1.4 s | 120 ms | 0 | 4.1 s |
| 2 | 97 | 1.1 s | 1.4 s | 110 ms | 0 | 4.1 s |
| 3 | 97 | 1.1 s | 1.4 s | 120 ms | 0 | 4.1 s |
| 4 | 100 | 1.2 s | 1.4 s | 60 ms | 0 | 1.4 s |
| 5 | 97 | 1.1 s | 1.4 s | 120 ms | 0 | 4.1 s |

Accessibility, Best Practices and SEO scored 100 in every run.

**A caveat on the numbers.** The build machine is slow for Lighthouse: its CPU benchmark index ranged
from 584 to 1,471 across runs. When Chrome is launched by the Lighthouse CLI on this Windows machine, its
first frame stalls for about 2.5 s after the page has fully loaded. A one-line HTML page doesn't do this,
and it doesn't happen when the same page is loaded through Playwright (first paint about 190 ms). That
stall is what inflates Speed Index in most rows above.

Pointing Lighthouse at a separately launched Chrome removes the stall: FCP 0.8 s, LCP 1.4 s and
Speed Index 0.8–1.2 s. It also moves more of the initial style and layout work into the measurement
window, so TBT read 130–390 ms and Performance 90–99 on this CPU. **Run PageSpeed Insights against the
deployed URL** for numbers from standard hardware.

---

## What's on the page

1. **Header**: custom SVG wordmark, sticky, accessible mobile menu (about 0.5 KB of vanilla JS).
2. **Hero** with the signature element: an **interactive speed check**. Type any domain, press
   *Check speed*, and a simulated 1.5 s scan reveals LCP, INP and CLS on Core Web Vitals scales, with a
   likely cause. Results are deterministic per domain: FNV-1a hash of the normalised host seeding a
   Mulberry32 PRNG.
3. **Social proof**: six fictional agencies, each with its own typographic wordmark.
4. **Problem**: three short statements plus a "how it usually goes" timeline.
5. **Features**: four asymmetric rows, each with a hand-built HTML/SVG visual (trend chart, Slack-style
   alert, white-label report page, sorted dashboard), then a full sample report image.
6. **How it works**: three real steps, so numbered markers are justified here.
7. **Pricing** (React island): monthly/yearly toggle, a 1–200 site slider that recommends a plan.
8. **Testimonials**: one featured quote and two supporting, all specific.
9. **FAQ**: native `<details>`, works with JavaScript off.
10. **Final call to action** and **footer**.

---

## Technical decisions

### Why Astro islands

Almost all of a landing page is static content, so shipping a framework to render it is pure cost.
Astro renders every section to HTML at build time. Only the two genuinely interactive pieces are React
components:

| Island | Hydration | Why |
| --- | --- | --- |
| `SpeedDemo.tsx` | `client:interaction` (custom, see below) | It's above the fold, but nobody needs it until they reach for it |
| `Pricing.tsx` | `client:visible` | It hydrates as it scrolls into view, ready before the first click |

Everything else (header, all visuals, FAQ) ships zero framework JS.

### A custom hydration directive: `client:interaction`

`client:idle` was the first choice for the hero demo. Measured, React's hydration cost 80–190 ms of
Total Blocking Time and sat on the critical path for LCP. `src/directives/interaction.ts` instead
hydrates on the first `pointerover`, `pointerdown`, `touchstart` or `focusin` inside the island.

The hard part is not losing the first click. React 19 hydrates concurrently, so "`hydrate()` resolved"
does not mean "the component is listening". The directive therefore:

- always calls `preventDefault()` on the island's form submit, so it never navigates;
- holds any submit that arrives early and replays it with `requestSubmit()` once the component dispatches
  an `island:ready` event from its mount effect;
- reads the input's DOM value on submit, so text typed before hydration is used.

`scripts/smoke.mjs` covers this, including a test that delays the JS by 1.2 s and taps immediately.

### `content-visibility` for below-the-fold sections

Every section below the hero uses a `defer-render` utility (`content-visibility: auto`). With it,
initial layout cost dropped from about 3.1 s to 1.3 s under 4× CPU throttling. Each section passes its
measured height per breakpoint (`--cis`, `--cis-md`, `--cis-lg`) so the scrollbar and anchor links are
accurate before a section first renders.

### Fonts

Instrument Sans Variable comes from `@fontsource-variable` and is served through Astro's Fonts API with
the local provider. Only the Latin `wght` file (29 KB) is used. Astro hashes and preloads it and
generates a metric-matched Arial fallback (`size-adjust`, `ascent-override` and so on), so the swap
causes no layout shift. No requests go to Google Fonts. Every character on the page is in the subset,
so there are no system font fallback lookups.

### CSS and design tokens

Tailwind CSS v4. Its configuration lives in `@theme` inside `src/styles/global.css`, which is the
single source of truth for color, type scale, radii and shadows. Tailwind's default palette is reset,
so only Loadline tokens exist. The stylesheet is inlined (`build.inlineStylesheets: 'always'`, 8 KB
gzip), which removes the only render-blocking request.

| Token | Light | Dark |
| --- | --- | --- |
| `canvas` | `#F7F8FA` | `#0E1116` |
| `surface` | `#FFFFFF` | `#151A21` |
| `ink` | `#14171C` | `#E8EBF0` |
| `muted` | `#5B6372` | `#9AA3B2` |
| `line` | `#DDE1E7` | `#262D37` |
| `accent` / `good` | `#0C8A5B` | `#2FBF86` |
| `accent-strong` (buttons, green text) | `#08754C` | `#2FBF86` |
| `warn` / `poor` | `#C98A04` / `#D23F31` | `#E3AA2B` / `#F0675C` |

The brand green `#0C8A5B` reaches only about 4.4:1 against white text, below WCAG AA for normal text.
It's used for graphics. Buttons and green text use `accent-strong` (5.7:1). Status colors appear only
on metric status and always come with a text label.

Dark mode is tuned rather than inverted: surfaces get lighter as they rise, status colors are
re-picked for contrast on dark, and the inverted ink CTA band becomes a raised surface instead of a
bright slab.

### Images

The four feature visuals are HTML, CSS and SVG, so they're crisp, theme-aware and tiny. The full sample
report is a raster, rendered from an HTML template by `scripts/render-assets.mjs`. It's served through
`<Picture>` as AVIF and WebP at five widths, lazy-loaded, with explicit dimensions. A full-size link is
provided for phones. The Open Graph image (1200×630) comes from the same script.

### Accessibility

- Landmarks, one `h1`, logical heading order, skip link, visible `:focus-visible` rings.
- The speed demo announces "Checking…" and then the full result through a polite `aria-live` region.
  Validation errors use `role="alert"` and `aria-invalid`, and `prefers-reduced-motion` skips the scan.
- Pricing uses native radio inputs for billing and a range input with `aria-valuetext`. The plan
  recommendation is announced only when it changes.
- Decorative product visuals are `role="img"` with a written summary, so screen readers don't read fake
  table data.
- The mobile menu has `aria-expanded`, closes on Escape and returns focus to its button.

### SEO

Title, description, canonical, Open Graph and Twitter tags, a designed OG image, an SVG, ICO and PNG
favicon set, a web manifest, `robots.txt`, a sitemap (`@astrojs/sitemap`) and `SoftwareApplication`
JSON-LD with a monthly and yearly `Offer` for each plan. The 404 page is `noindex`.

### Known trade-offs

- **No Content-Security-Policy.** Astro's CSP support hashes `<script>` and `<style>` elements, but the
  islands and the `content-visibility` size estimates use inline `style` attributes, which a strict
  `style-src` would block. The other security headers are set in `public/_headers`.
- **React rather than Preact.** Preact with its React compatibility layer would cut the lazy bundle from
  about 73 KB to about 10 KB with the same code (`@astrojs/preact` with `compat: true`). React was kept
  deliberately. Because it no longer loads on page load, it doesn't affect any load metric.

---

## Project structure

```
src/
  components/
    Header.astro  Logo.astro  Hero.astro  SpeedDemo.tsx
    SocialProof.astro  Problem.astro  Features.astro  HowItWorks.astro
    PricingSection.astro  Pricing.tsx  Testimonials.astro  FAQ.astro  CTA.astro  Footer.astro
    visuals/      TrendChart  SlackAlert  ReportMini  SiteList   (feature visuals)
  directives/     interaction.ts (client:interaction), integration.ts
  layouts/        BaseLayout.astro (SEO head, JSON-LD, font preload)
  lib/            metrics.ts (CWV thresholds), scan.ts (deterministic fake scan),
                  plans.ts (pricing data, shared with JSON-LD), site.ts, island.ts
  pages/          index.astro, 404.astro
  styles/         global.css (Tailwind v4 @theme tokens, base, components)
  assets/         sample-report.png (source for <Picture>)
public/           favicons, manifest, og.png, robots.txt, _headers
scripts/
  smoke.mjs          functional tests: demo, keyboard, reduced motion, pricing, menu, FAQ, 404
  screens.mjs        screenshots at 360/768/1024/1440 in light and dark; reports overflow and console errors
  render-assets.mjs  renders the sample report and OG image from HTML templates
  icons.mjs          builds the PNG/ICO favicon set from favicon.svg
```

## Commands

```sh
pnpm install
pnpm dev            # http://localhost:4321
pnpm build          # astro check (types) + static build into dist/
pnpm preview        # serve dist/ locally
pnpm test           # smoke tests against a running preview: pnpm test http://localhost:4321/
pnpm qa:screens     # screenshots: pnpm qa:screens http://localhost:4321/ ./screens --demo
pnpm assets         # re-render sample report, OG image and favicons
```

The QA scripts drive your installed Google Chrome through `playwright-core`, so no browser download
is needed.

---

## Deploy to Cloudflare Pages

### Option A: Git integration (recommended)

1. Push the repository to GitHub or GitLab.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and choose
   the repository.
3. Build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Astro |
   | Build command | `pnpm build` |
   | Build output directory | `dist` |
   | Environment variables | `NODE_VERSION` = `24`, `PNPM_VERSION` = `12.3.4` |

4. Deploy. Cloudflare serves `dist/404.html` for unknown routes and applies `public/_headers`, which sets
   immutable caching for fingerprinted assets plus security headers.

### Option B: Direct upload with Wrangler

```sh
pnpm build
pnpm dlx wrangler pages deploy dist --project-name loadline
```

### After deploying

- If the site isn't at `https://loadline.pages.dev`, update `site` in `astro.config.mjs`, `url` in
  `src/lib/site.ts` and the sitemap line in `public/robots.txt`. Canonical, Open Graph, JSON-LD and the
  sitemap all derive from those.
- Run [PageSpeed Insights](https://pagespeed.web.dev/) on the live URL to confirm the scores on standard
  hardware.

---

Loadline, its customers, testimonials and data are fictional. No real company logos are used.
