import { readSession, COOKIES } from './session';
import { supabaseAdmin } from './supabaseAdmin';

// A creator's own session normally wins by default — it's the more common
// caller (the creator-facing app) and cryptographically tied to a specific
// person's specific agency. But GET /api/creators, /api/battles, and
// /api/posts are each called from BOTH the admin panel and the creator
// app, and if one browser ever holds a valid session for each role at
// once (a shared/public computer, a family laptop, an admin curiously
// testing the creator flow on a different agency, or just this codebase's
// own 30-day "remember me" window), the wrong one silently wins — an
// admin action can land in a totally unrelated agency with no error.
//
// preferredRole lets each caller say which session type it's actually
// acting as, so that one gets checked first instead of blindly defaulting
// to creator-first. Every branch still re-verifies the record the cookie
// points to still exists before trusting it — a signed cookie proves the
// token wasn't forged, not that the creator/agency it names hasn't since
// been removed.
export async function resolveAgencyId(req, preferredRole) {
  const tryCreator = async () => {
    const creator = readSession(req, COOKIES.CREATOR);
    if (!creator) return null;
    const { data } = await supabaseAdmin.from('creators').select('agency_id').eq('id', creator.creatorId).single();
    return data ? data.agency_id : null;
  };
  const tryAdmin = async () => {
    const admin = readSession(req, COOKIES.ADMIN);
    if (!admin) return null;
    const { data } = await supabaseAdmin.from('agencies').select('id').eq('id', admin.agencyId).single();
    return data ? data.id : null;
  };
  const tryScope = async () => {
    const scope = readSession(req, COOKIES.AGENCY_SCOPE);
    if (!scope) return null;
    const { data } = await supabaseAdmin.from('agencies').select('id').eq('id', scope.agencyId).single();
    return data ? data.id : null;
  };

  const order = preferredRole === 'admin' ? [tryAdmin, tryCreator, tryScope] : [tryCreator, tryAdmin, tryScope];
  for (const attempt of order) {
    const id = await attempt();
    if (id) return id;
  }
  return null;
}
