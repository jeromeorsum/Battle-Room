import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, clearSessionCookie, COOKIES, pinFingerprint } from '../../lib/session';
import { isLockedOut } from '../../lib/agencyStatus';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.CREATOR);
  if (!session) return res.status(401).json({ error: 'Not logged in.' });

  const { data: creator } = await supabaseAdmin.from('creators').select('id, name, agency_id, pin_hash, age_self_confirmed').eq('id', session.creatorId).single();
  if (!creator) return res.status(401).json({ error: 'Not logged in.' });

  // If the PIN has changed (or an admin reset it) since this session was
  // issued, the stamped fingerprint no longer matches the current one —
  // force the stale session out. Sessions issued before this field existed
  // won't carry a pinFp; those are left alone (they still expire normally)
  // rather than logging everyone out on deploy.
  if (session.pinFp && session.pinFp !== pinFingerprint(creator.pin_hash)) {
    clearSessionCookie(res, COOKIES.CREATOR);
    return res.status(401).json({ error: 'Your PIN was changed — please sign in again.' });
  }

  const { data: agency } = await supabaseAdmin.from('agencies').select('id, name, agency_code, status').eq('id', creator.agency_id).single();

  // A canceled agency forces every existing session out on its next check —
  // this is what makes cutoff "automatic" instead of relying on someone
  // manually clicking a button.
  if (isLockedOut(agency?.status)) {
    clearSessionCookie(res, COOKIES.CREATOR);
    return res.status(402).json({ error: 'This agency\u2019s account is inactive.' });
  }

  return res.status(200).json({ creatorId: creator.id, name: creator.name, agencyId: creator.agency_id, agencyName: agency ? agency.name : '', agencyCode: agency ? agency.agency_code : '', needsAgeConfirmation: !creator.age_self_confirmed });
}
