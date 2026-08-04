// Edit these numbers any time — this file is the single source of truth
// for pricing shown on the landing page and used at signup.
export const PRICING_TIERS = [
  {
    id: 'starter',
    label: 'Starter',
    maxCreators: 100,
    monthly: 49,
    yearly: 499,
    blurb: 'For agencies getting their battle roster organized.'
  },
  {
    id: 'growth',
    label: 'Growth',
    maxCreators: 250,
    monthly: 99,
    yearly: 1008, // same % discount vs. monthly x 12 as the Starter tier
    blurb: 'For growing rosters running battles daily.'
  },
  {
    id: 'scale',
    label: 'Scale',
    maxCreators: 500,
    monthly: 175,
    yearly: 1782, // same % discount vs. monthly x 12 as the Starter tier
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
