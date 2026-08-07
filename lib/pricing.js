// Edit these numbers any time — this file is the single source of truth
// for pricing shown on the landing page and used at signup.
export const PRICING_TIERS = [
  {
    id: 'starter',
    label: 'Starter',
    maxCreators: 100,
    monthly: 49,
    yearly: 500,
    blurb: 'For agencies getting their battle roster organized.'
  },
  {
    id: 'growth',
    label: 'Growth',
    maxCreators: 250,
    monthly: 99,
    yearly: 1000,
    blurb: 'For growing rosters running battles daily.'
  },
  {
    id: 'scale',
    label: 'Scale',
    maxCreators: 500,
    monthly: 175,
    yearly: 1800,
    blurb: 'For larger, multi-team agencies.'
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    maxCreators: null, // null = no cap / custom
    monthly: null, // null = "Contact us" instead of a number
    yearly: null,
    blurb: '500+ creators, or custom terms — talk to us.'
  }
];

export function tierById(id) {
  return PRICING_TIERS.find((t) => t.id === id) || PRICING_TIERS[0];
}

// The smallest tier whose creator cap actually fits their current roster —
// used to auto-assign the right plan once a trial ends, based on real usage
// rather than whatever they guessed at signup.
export function tierForCreatorCount(count) {
  return PRICING_TIERS.find((t) => t.maxCreators === null || count <= t.maxCreators) || PRICING_TIERS[PRICING_TIERS.length - 1];
}
