// Edit these numbers any time — this file is the single source of truth
// for pricing shown on the landing page and used at signup.
//
// NOTE: the amount Stripe actually charges comes from the Stripe Price
// objects referenced in your env vars (see lib/priceMap.js) — if you change
// numbers here, create matching Prices in the Stripe dashboard and update
// the STRIPE_PRICE_* env vars, or the checkout will charge the old amount.
//
// Yearly = 10x monthly across the board ("2 months free") — one simple
// rule that's easy to advertise instead of a different discount per tier.
export const PRICING_TIERS = [
  {
    id: 'starter',
    label: 'Starter',
    maxCreators: 50,
    monthly: 39,
    yearly: 390,
    blurb: 'For agencies getting their battle roster organized.'
  },
  {
    id: 'growth',
    label: 'Growth',
    maxCreators: 200,
    monthly: 89,
    yearly: 890,
    popular: true,
    blurb: 'For growing rosters running battles daily.'
  },
  {
    id: 'scale',
    label: 'Scale',
    maxCreators: 500,
    monthly: 179,
    yearly: 1790,
    blurb: 'For larger, multi-team agencies.'
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    maxCreators: null, // null = no cap / custom
    monthly: null, // null = "Contact us" instead of a number
    yearly: null,
    blurb: 'Over 500 creators, or custom terms — talk to us.'
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
