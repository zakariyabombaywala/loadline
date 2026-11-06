import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { METRICS, STATUS_LABEL, positionOf, type MetricSpec, type Status } from '../lib/metrics';
import { normaliseHost, scan, type ScanResult } from '../lib/scan';
import { ISLAND_READY } from '../lib/island';

const SCAN_STEPS = [
  { at: 0, text: (host: string) => `Loading ${host} on mobile` },
  { at: 450, text: () => 'Measuring Largest Contentful Paint' },
  { at: 850, text: () => 'Timing interactions' },
  { at: 1150, text: () => 'Checking layout shifts' },
] as const;
const SCAN_DURATION = 1500;

const HOST_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

const FILL: Record<Status, string> = { good: 'bg-good', warn: 'bg-warn', poor: 'bg-poor' };
const TEXT: Record<Status, string> = { good: 'text-good-text', warn: 'text-warn-text', poor: 'text-poor-text' };

type Phase = 'idle' | 'scanning' | 'done';

export default function SpeedDemo() {
  const [url, setUrl] = useState('clientsite.com');
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const timers = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const inputId = useId();
  const errorId = useId();

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => {
    // The island hydrates on first interaction, so someone may have typed already.
    const input = inputRef.current;
    if (input && input.value !== url) setUrl(input.value);
    // Tell client:interaction we're listening, so it can replay a held submit.
    input?.dispatchEvent(new Event(ISLAND_READY, { bubbles: true }));
    return clearTimers;
    // Runs once, on hydration: url is only compared, never a dependency.
  }, []);

  const finish = (next: ScanResult) => {
    setResult(next);
    setPhase('done');
    setAnnouncement(describe(next));
  };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phase === 'scanning') return;

    // Read the field directly: a replayed submit can arrive before state catches up.
    const host = normaliseHost(inputRef.current?.value ?? url);
    if (!HOST_PATTERN.test(host)) {
      setError('Enter a site address, like clientsite.com.');
      return;
    }
    setError('');
    clearTimers();

    const next = scan(host);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish(next);
      return;
    }

    setResult(null);
    setPhase('scanning');
    setAnnouncement(`Checking ${host}.`);
    for (const s of SCAN_STEPS) {
      timers.current.push(window.setTimeout(() => setStep(s.text(host)), s.at));
    }
    timers.current.push(window.setTimeout(() => finish(next), SCAN_DURATION));
  };

  const scanning = phase === 'scanning';
  const issues = result ? Object.values(result.statuses).filter((s) => s !== 'good').length : 0;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-instrument">
      <div className="flex items-center justify-between border-b border-line px-5 py-3 text-sm">
        <span className="font-semibold">Speed check</span>
        <span className="text-xs text-muted">Sample data</span>
      </div>

      <form onSubmit={onSubmit} noValidate className="px-5 pt-5">
        <label htmlFor={inputId} className="mb-2 block text-sm text-muted">
          Site address
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            autoCapitalize="none"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-11 min-w-0 flex-1 rounded-lg border border-line-strong bg-canvas px-3 text-base text-ink outline-offset-1 placeholder:text-muted aria-invalid:border-poor"
          />
          <button type="submit" className="btn btn-primary shrink-0" aria-disabled={scanning || undefined}>
            {scanning ? 'Checking…' : 'Check speed'}
          </button>
        </div>
        <p id={errorId} className="mt-2 min-h-5 text-sm text-poor-text" role={error ? 'alert' : undefined}>
          {error}
        </p>
      </form>

      <div className="relative px-5 pb-1 text-sm">
        <div className="h-px w-full bg-line" aria-hidden="true">
          {scanning && <div className="scan-progress h-px bg-accent" />}
        </div>
        <p className="flex h-10 items-center text-muted tnum" aria-hidden="true">
          {phase === 'idle' && 'Ready. Press Check speed to run a sample scan.'}
          {scanning && <span className="scan-step">{step}…</span>}
          {phase === 'done' && result && (
            <span className="truncate">
              {result.host} · <span className="hidden sm:inline">Mobile, 4G · </span>
              {issues === 0 ? 'All metrics good' : `${issues} of 3 need attention`}
            </span>
          )}
        </p>
      </div>

      <ul className="space-y-5 px-5 pb-6">
        {METRICS.map((spec, i) => (
          <MetricRow
            key={spec.key}
            spec={spec}
            value={result?.values[spec.key]}
            status={result?.statuses[spec.key]}
            delay={i * 90}
          />
        ))}
      </ul>

      <div className="border-t border-line bg-sunken/60 px-5 py-4 text-sm">
        <p className="text-muted">Likely cause</p>
        <p className="mt-1 min-h-[2.75rem] font-medium text-ink">
          {result ? result.cause : scanning ? '' : 'Run a check to see what is slowing the page down.'}
        </p>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}

interface RowProps {
  spec: MetricSpec;
  value: number | undefined;
  status: Status | undefined;
  delay: number;
}

function MetricRow({ spec, value, status, delay }: RowProps) {
  const has = value !== undefined && status !== undefined;
  const pos = has ? positionOf(spec, value) : 0;
  const goodEnd = (spec.good / spec.max) * 100;
  const warnEnd = (spec.needsWork / spec.max) * 100;

  return (
    <li>
      <div className="flex items-baseline gap-3">
        <abbr title={spec.name} className="w-9 shrink-0 text-sm font-semibold no-underline">
          {spec.label}
        </abbr>
        <span className="min-w-0 flex-1 truncate text-sm text-muted" aria-hidden="true">
          <span className="hidden sm:inline">{spec.name}</span>
        </span>
        <span className="w-16 text-right text-lg font-semibold tracking-tight tnum">
          {has ? spec.format(value) : '—'}
        </span>
        <span className={`w-[5.75rem] text-right text-sm font-medium ${has ? TEXT[status] : 'text-muted'}`}>
          {has ? STATUS_LABEL[status] : 'Not run'}
        </span>
      </div>

      <div className="relative mt-2.5 h-1.5" aria-hidden="true">
        {/* The scale: good, needs work and poor ranges, tinted. */}
        <div className="absolute inset-0 flex gap-0.5 overflow-hidden rounded-full">
          <span className="h-full rounded-l-full bg-good/18" style={{ width: `${goodEnd}%` }} />
          <span className="h-full bg-warn/22" style={{ width: `${warnEnd - goodEnd}%` }} />
          <span className="h-full flex-1 rounded-r-full bg-poor/18" />
        </div>
        {/*
          The reading: a solid fill up to the value, and a marker on it. Both move with
          transforms only, so the reveal never registers as a layout shift.
        */}
        <div
          className={`meter-fill absolute inset-0 rounded-full ${has ? FILL[status] : 'bg-transparent'}`}
          style={{ transform: `scaleX(${pos / 100})`, transitionDelay: `${delay}ms` }}
        />
        <div
          className="meter-track absolute inset-0"
          style={{ transform: `translateX(${pos}%)`, transitionDelay: `${delay}ms` }}
        >
          <span
            className={`absolute top-1/2 left-0 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface transition-opacity duration-200 ${has ? FILL[status] : 'opacity-0'}`}
          />
        </div>
      </div>
      <div className="relative mt-1.5 hidden h-4 text-[0.6875rem] text-muted tnum sm:block" aria-hidden="true">
        <span className="absolute -translate-x-1/2" style={{ left: `${goodEnd}%` }}>
          {spec.format(spec.good)}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${warnEnd}%` }}>
          {spec.format(spec.needsWork)}
        </span>
      </div>
    </li>
  );
}

function describe(result: ScanResult): string {
  const parts = METRICS.map(
    (m) => `${m.label} ${m.spoken(result.values[m.key])}, ${STATUS_LABEL[result.statuses[m.key]]}.`,
  );
  return `Results for ${result.host}. ${parts.join(' ')} Likely cause: ${result.cause}`;
}
