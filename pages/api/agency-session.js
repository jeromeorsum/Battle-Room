import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, clearSessionCookie, COOKIES } from '../../lib/session';
import { isLockedOut } from '../../lib/agencyStatus';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.AGENCY_SCOPE);
  if (!session) return res.status(401).json({ error: 'No agency scope.' });

  const { data: agency } = await supabaseAdmin.from('agencies').select('id, name, status').eq('id', session.agencyId).single();
  if (!agency) return res.status(401).json({ error: 'No agency scope.' });

  if (isLockedOut(agency.status)) {
    clearSessionCookie(res, COOKIES.AGENCY_SCOPE);
    clearSessionCookie(res, COOKIES.CREATOR);
    return res.status(402).json({ error: 'This agency\u2019s account is inactive.' });
  }

  return res.status(200).json(agency);
}
