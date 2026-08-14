import { supabaseAdmin } from './supabaseAdmin';

// Sessions are stateless JWTs — once issued, they're cryptographically
// valid until they expire (up to 30 days with "remember me"), regardless
// of what happens to the underlying account afterward. That's fine for
// most read-only actions, but for genuinely sensitive ones (deleting the
// agency, managing the team, touching 2FA) it's worth the one extra DB
// lookup to confirm a removed team member's old session can't still do
// damage during that window.
//
// Only checks sessions tied to an individual account (agencyUserId set).
// Shared-code sessions have no equivalent per-person row to check against
// — rotating the shared code is the existing mechanism for cutting those
// off, a separate lower-priority gap since shared-code holders are
// already less individually accountable.
export async function verifyStillActive(session) {
  if (!session) return false;
  if (!session.agencyUserId) return true; // shared-code session, nothing to re-check
  const { data } = await supabaseAdmin.from('agency_users').select('id').eq('id', session.agencyUserId).eq('agency_id', session.agencyId).single();
  return !!data;
}
