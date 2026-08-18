// Single source of truth for the free-trial + auto-renewal terms.
//
// The clear-and-conspicuous disclosure shown at signup, the Terms of
// Service auto-renewal section, and the pre-billing reminder email all read
// from here so the numbers and promises can never drift apart — which is
// itself a compliance point (Idaho Code § 48-603G and the FTC's ROSCA both
// require the disclosed terms to match what actually happens).

export const TRIAL_DAYS = 14;

// How many days before the trial ends we send the "you're about to be
// charged" reminder. Idaho/FTC guidance for a free trial of a month or more
// that auto-renews into paid is to notify the consumer 1–7 days before the
// charge; we use 3 to sit comfortably inside that window.
export const TRIAL_REMINDER_DAYS_BEFORE = 3;

// Builds the exact plain-English disclosure sentence for a given plan/price.
// Kept as a function so every surface renders identical wording.
export function trialDisclosureLine({ price, period = 'month', firstChargeDate } = {}) {
  const amount = price != null ? `$${price}` : 'the plan price';
  const per = period === 'year' ? 'year' : 'month';
  const when = firstChargeDate ? ` on ${firstChargeDate}` : ` when your ${TRIAL_DAYS}-day trial ends`;
  return `Free for ${TRIAL_DAYS} days, then ${amount}/${per}, charged automatically${when}, recurring every ${per} until you cancel. Cancel anytime before then in your admin billing settings and you won't be charged.`;
}
