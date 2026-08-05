// You create these Prices in your own Stripe dashboard (Product catalog),
// then paste the resulting Price IDs into your environment variables with
// these exact names. This file just looks them up — no numbers are
// hardcoded here on purpose, so changing a price in Stripe doesn't require
// a code change, only a new Price ID in the env vars.
export function priceIdFor(planTier, billingPeriod) {
  const key = `STRIPE_PRICE_${planTier.toUpperCase()}_${billingPeriod.toUpperCase()}`;
  return process.env[key] || null;
}
