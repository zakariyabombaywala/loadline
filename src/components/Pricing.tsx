import { useId, useState } from 'react';
import { PLANS, planForSites, yearlyPerMonth, yearlyTotal, type Billing, type Plan } from '../lib/plans';

interface Props {
  signupHref: string;
}

const DEFAULT_SITES = 24;

export default function Pricing({ signupHref }: Props) {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [sites, setSites] = useState(DEFAULT_SITES);
  const recommended = planForSites(sites);

  const sliderId = useId();
  const billingName = useId();

  return (
    <div>
      <div className="flex flex-col gap-8 border-y border-line py-7 md:flex-row md:items-center md:justify-between md:gap-12">
        <fieldset className="shrink-0">
          <legend className="sr-only">Billing period</legend>
          <div className="inline-flex rounded-lg bg-sunken p-1">
            {(['monthly', 'yearly'] as const).map((option) => (
              <label key={option} className="billing-option relative cursor-pointer">
                <input
                  type="radio"
                  name={billingName}
                  value={option}
                  checked={billing === option}
                  onChange={() => setBilling(option)}
                  className="peer sr-only"
                />
                <span className="flex h-10 items-center gap-2 rounded-md px-4 text-[0.9375rem] font-medium text-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-card peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                  {option === 'monthly' ? 'Monthly' : 'Yearly'}
                  {option === 'yearly' && <span className="text-sm text-good-text">2 months free</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="w-full md:max-w-md">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={sliderId} className="text-[0.9375rem] font-medium">
              How many sites do you manage?
            </label>
            <output htmlFor={sliderId} className="text-lg font-semibold tnum" aria-hidden="true">
              {sites}
            </output>
          </div>
          <input
            id={sliderId}
            type="range"
            min={1}
            max={200}
            step={1}
            value={sites}
            onChange={(e) => setSites(Number(e.target.value))}
            aria-valuetext={`${sites} ${sites === 1 ? 'site' : 'sites'}`}
            className="site-slider mt-3 w-full"
            style={{ ['--fill' as string]: `${((sites - 1) / 199) * 100}%` }}
          />
          <p className="mt-2 text-sm text-muted" aria-live="polite">
            {recommended.name} fits you, with room for up to {recommended.maxSites} sites.
          </p>
        </div>
      </div>

      <ul className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-0">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billing={billing}
            recommended={plan.id === recommended.id}
            sites={sites}
            signupHref={signupHref}
          />
        ))}
      </ul>
    </div>
  );
}

interface CardProps {
  plan: Plan;
  billing: Billing;
  recommended: boolean;
  sites: number;
  signupHref: string;
}

function PlanCard({ plan, billing, recommended, sites, signupHref }: CardProps) {
  const price = billing === 'monthly' ? plan.monthly : yearlyPerMonth(plan);

  return (
    <li
      className={[
        'relative flex flex-col rounded-[var(--radius-card)] p-7 sm:p-8',
        plan.popular
          ? 'z-10 bg-surface shadow-instrument ring-2 ring-accent lg:-my-4 lg:py-12'
          : 'border border-line bg-surface lg:border-transparent lg:bg-transparent',
      ].join(' ')}
    >
      <div className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="text-heading">
          {plan.name}
        </h3>
        {plan.popular && (
          <span className="rounded-full bg-accent-strong px-2.5 py-0.5 text-xs font-semibold text-on-accent">Most popular</span>
        )}
      </div>
      <p className="mt-2 min-h-12 text-[0.9375rem] text-muted">{plan.summary}</p>

      <p className="mt-6 flex items-baseline gap-1.5">
        <span className="text-[2.75rem] leading-none font-semibold tracking-[-0.03em] tnum">${price}</span>
        <span className="text-muted">/ month</span>
      </p>
      <p className="mt-2 min-h-5 text-sm text-muted tnum">
        {billing === 'monthly' ? 'Billed monthly' : `$${yearlyTotal(plan)} billed yearly`}
      </p>

      <a href={signupHref} className={`btn mt-7 w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
        Start free trial<span className="sr-only"> on {plan.name}</span>
      </a>
      <p className="mt-3 min-h-5 text-center text-sm tnum">
        {recommended ? (
          <span className="font-medium text-good-text">
            Fits your {sites} {sites === 1 ? 'site' : 'sites'}
          </span>
        ) : (
          <span className="text-muted">Up to {plan.maxSites} sites</span>
        )}
      </p>

      <ul className="mt-7 space-y-3 border-t border-line pt-7 text-[0.9375rem]">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <svg className="mt-1 size-4 shrink-0 text-accent" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m3 8.5 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
    </li>
  );
}
