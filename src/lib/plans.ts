export type Billing = 'monthly' | 'yearly';

export interface Plan {
  id: 'starter' | 'agency' | 'scale';
  name: string;
  summary: string;
  monthly: number;
  maxSites: number;
  popular?: boolean;
  features: string[];
}

/** Yearly billing charges 10 months for 12. */
export const YEARLY_MONTHS_CHARGED = 10;

export const PLANS: readonly Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    summary: 'For small studios with a handful of retainer clients.',
    monthly: 29,
    maxSites: 10,
    features: [
      'Up to 10 sites, 5 pages each',
      'Daily mobile and desktop checks',
      'Slack and email alerts with likely cause',
      'Monthly PDF reports',
      '30 days of history',
      '2 team seats',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    summary: 'For agencies that report on speed every month.',
    monthly: 79,
    maxSites: 50,
    popular: true,
    features: [
      'Up to 50 sites, 15 pages each',
      'Everything in Starter',
      'White-label reports with your logo and colors',
      'Shareable client report links',
      '12 months of history',
      '10 team seats',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    summary: 'For large portfolios and dedicated care teams.',
    monthly: 199,
    maxSites: 200,
    features: [
      'Up to 200 sites, 30 pages each',
      'Everything in Agency',
      'Reports on your own domain',
      'Checks behind a login',
      'API and webhooks',
      'Unlimited seats, priority support',
    ],
  },
];

export function yearlyTotal(plan: Plan): number {
  return plan.monthly * YEARLY_MONTHS_CHARGED;
}

/** Effective monthly price on yearly billing, rounded to whole dollars for display. */
export function yearlyPerMonth(plan: Plan): number {
  return Math.round(yearlyTotal(plan) / 12);
}

export function planForSites(sites: number): Plan {
  return PLANS.find((p) => sites <= p.maxSites) ?? PLANS[PLANS.length - 1]!;
}
