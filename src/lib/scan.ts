import { METRICS, statusOf, type MetricKey, type Status } from './metrics';

export interface ScanResult {
  host: string;
  values: Record<MetricKey, number>;
  statuses: Record<MetricKey, Status>;
  cause: string;
}

/** Normalise what people type so "https://www.Site.com/" and "site.com" match. */
export function normaliseHost(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '');
}

/** FNV-1a 32-bit hash. Small, fast and stable across runs. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: a seeded PRNG, so each host always produces the same report. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;

const pick = <T,>(rand: Rand, list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
const between = (rand: Rand, min: number, max: number) => min + rand() * (max - min);

const PAGES = ['/pricing', '/', '/shop', '/blog', '/contact', '/services', '/about'] as const;

const CAUSES: Record<MetricKey, ReadonlyArray<(rand: Rand) => string>> = {
  lcp: [
    (r) => `Hero image grew to ${between(r, 1.6, 3.9).toFixed(1)} MB on ${pick(r, PAGES)}`,
    (r) => `Server response took ${between(r, 1.2, 2.4).toFixed(1)} s on ${pick(r, PAGES)}`,
    (r) => `New slider script delays the hero image on ${pick(r, PAGES)}`,
    () => 'Render-blocking font file added to every page',
  ],
  inp: [
    (r) => `Chat widget runs ${Math.round(between(r, 220, 480))} ms of script on every tap`,
    (r) => `Cookie banner blocks the main thread on ${pick(r, PAGES)}`,
    () => 'Analytics tag fires a long task on every click in checkout',
  ],
  cls: [
    (r) => `Promo banner pushes the page down on ${pick(r, PAGES)}`,
    () => 'Images without width and height on /blog',
    () => 'Late-loading web font shifts the headline on /about',
  ],
};

export function scan(input: string): ScanResult {
  const host = normaliseHost(input);
  const rand = seeded(hash(host));

  // Skewed towards realistic agency sites: often fine, sometimes one clear problem.
  const values: Record<MetricKey, number> = {
    lcp: Number(between(rand, 1.1, 5.4).toFixed(1)),
    inp: Math.round(between(rand, 70, 640) / 10) * 10,
    cls: Number((rand() ** 2 * 0.36 + 0.01).toFixed(2)),
  };

  const statuses = Object.fromEntries(
    METRICS.map((m) => [m.key, statusOf(m, values[m.key])]),
  ) as Record<MetricKey, Status>;

  // The likely cause explains whichever metric is furthest past its "good" threshold.
  const worst = METRICS.map((m) => ({ key: m.key, over: values[m.key] / m.good })).sort(
    (a, b) => b.over - a.over,
  )[0]!;

  const cause =
    worst.over <= 1
      ? 'No regressions found. All three metrics are in the good range.'
      : pick(rand, CAUSES[worst.key])(rand);

  return { host, values, statuses, cause };
}
