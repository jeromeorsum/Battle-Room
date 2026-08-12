import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, clearSessionCookie, COOKIES } from '../../lib/session';
import { isLockedOut } from '../../lib/agencyStatus';
import { generateAgencyCode } from '../../lib/codes';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Not logged in.' });

  let { data: agency } = await supabaseAdmin
    .from('agencies').select('id, name, plan_tier, billing_period, status, max_creators, trial_ends_at, referral_code, accent_color, stripe_current_period_end, stripe_cancel_at_period_end').eq('id', session.agencyId).single();
  if (!agency) return res.status(401).json({ error: 'Not logged in.' });

  // Agencies created before the referral feature existed won't have a
  // code yet — generate one the first time it's needed instead of leaving
  // it permanently blank.
  if (!agency.referral_code) {
    let code = generateAgencyCode(6);
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: clash } = await supabaseAdmin.from('agencies').select('id').eq('referral_code', code).single();
      if (!clash) break;
      code = generateAgencyCode(6);
    }
    await supabaseAdmin.from('agencies').update({ referral_code: code }).eq('id', agency.id);
    agency = { ...agency, referral_code: code };
  }

  if (isLockedOut(agency.status)) {
    clearSessionCookie(res, COOKIES.ADMIN);
    clearSessionCookie(res, COOKIES.AGENCY_SCOPE);
    return res.status(402).json({ error: 'This agency\u2019s account is inactive.' });
  }

  return res.status(200).json({ ...agency, role: session.role || 'admin', agencyUserId: session.agencyUserId || null, email: session.email || null });
}
