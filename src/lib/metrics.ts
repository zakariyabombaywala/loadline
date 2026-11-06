export type MetricKey = 'lcp' | 'inp' | 'cls';
export type Status = 'good' | 'warn' | 'poor';

export interface MetricSpec {
  key: MetricKey;
  label: string;
  name: string;
  /** Upper bounds of "good" and "needs work", per Google's Core Web Vitals thresholds. */
  good: number;
  needsWork: number;
  /** Right edge of the bar scale. */
  max: number;
  format: (value: number) => string;
  spoken: (value: number) => string;
}

export const METRICS: readonly MetricSpec[] = [
  {
    key: 'lcp',
    label: 'LCP',
    name: 'Largest Contentful Paint',
    good: 2.5,
    needsWork: 4,
    max: 6,
    format: (v) => `${v.toFixed(1)} s`,
    spoken: (v) => `${v.toFixed(1)} seconds`,
  },
  {
    key: 'inp',
    label: 'INP',
    name: 'Interaction to Next Paint',
    good: 200,
    needsWork: 500,
    max: 800,
    format: (v) => `${Math.round(v)} ms`,
    spoken: (v) => `${Math.round(v)} milliseconds`,
  },
  {
    key: 'cls',
    label: 'CLS',
    name: 'Cumulative Layout Shift',
    good: 0.1,
    needsWork: 0.25,
    max: 0.4,
    format: (v) => v.toFixed(2),
    spoken: (v) => v.toFixed(2),
  },
];

export const STATUS_LABEL: Record<Status, string> = {
  good: 'Good',
  warn: 'Needs work',
  poor: 'Poor',
};

export function statusOf(spec: MetricSpec, value: number): Status {
  if (value <= spec.good) return 'good';
  if (value <= spec.needsWork) return 'warn';
  return 'poor';
}

/** Position on the bar scale as a percentage, clamped to the visible track. */
export function positionOf(spec: MetricSpec, value: number): number {
  return Math.min(100, Math.max(0, (value / spec.max) * 100));
}
