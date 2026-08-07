import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, clearSessionCookie, COOKIES } from '../../lib/session';
import { isLockedOut } from '../../lib/agencyStatus';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Not logged in.' });

  const { data: agency } = await supabaseAdmin
    .from('agencies').select('id, name, plan_tier, billing_period, status, max_creators, trial_ends_at, referral_code, accent_color').eq('id', session.agencyId).single();
  if (!agency) return res.status(401).json({ error: 'Not logged in.' });

  if (isLockedOut(agency.status)) {
    clearSessionCookie(res, COOKIES.ADMIN);
    clearSessionCookie(res, COOKIES.AGENCY_SCOPE);
    return res.status(402).json({ error: 'This agency\u2019s account is inactive.' });
  }

  return res.status(200).json({ ...agency, role: session.role || 'admin' });
}
