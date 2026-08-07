// Pure logic, no imports — this is intentional so it can be unit-tested
// without needing real Supabase credentials. The DB-touching lookup lives
// in agencyStatusDb.js instead.

export function canWrite(status, trialEndsAt) {
  if (status === 'active') return true;
  if (status === 'trialing') {
    if (!trialEndsAt) return true; // no expiry set (legacy row) — don't block
    return new Date(trialEndsAt) > new Date();
  }
  return false;
}

// A canceled agency is fully locked out — no login, no viewing, existing
// sessions get rejected on their next request. 'past_due' is softer (view
// but can't act) so a temporarily failed card doesn't nuke someone's data.
export function isLockedOut(status) {
  return status === 'canceled';
}
