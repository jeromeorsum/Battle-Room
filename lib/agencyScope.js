import { readSession, COOKIES } from './session';
import { supabaseAdmin } from './supabaseAdmin';

// A creator's own session always wins — it's cryptographically tied to a
// specific person's specific agency, more trustworthy than a separate
// "agency scope" cookie that could theoretically go stale (e.g. testing
// multiple agency codes on one device). Admin session next, then the
// generic scope cookie as a last resort for someone who's only resolved
// an agency code but hasn't logged into a specific profile yet.
//
// Every branch re-verifies the record the cookie points to still exists
// before trusting it — a signed cookie proves the token wasn't forged, not
// that the creator/agency it names hasn't since been removed. Without this,
// a leftover creator session from a deleted (or since-reassigned) agency
// can silently outrank a valid admin session for the same browser, sending
// actions to the wrong place instead of falling through correctly.
export async function resolveAgencyId(req) {
  const creator = readSession(req, COOKIES.CREATOR);
  if (creator) {
    const { data } = await supabaseAdmin.from('creators').select('agency_id').eq('id', creator.creatorId).single();
    if (data) return data.agency_id;
    // Falls through intentionally — a stale creator cookie shouldn't block
    // a still-valid admin or scope cookie from being used instead.
  }
  const admin = readSession(req, COOKIES.ADMIN);
  if (admin) {
    const { data } = await supabaseAdmin.from('agencies').select('id').eq('id', admin.agencyId).single();
    if (data) return data.id;
  }
  const scope = readSession(req, COOKIES.AGENCY_SCOPE);
  if (scope) {
    const { data } = await supabaseAdmin.from('agencies').select('id').eq('id', scope.agencyId).single();
    if (data) return data.id;
  }
  return null;
}
