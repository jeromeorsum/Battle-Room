import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { setSessionCookie, COOKIES } from '../../lib/session';
import { checkLock, recordFailure, recordSuccess } from '../../lib/rateLimit';
import { isLockedOut } from '../../lib/agencyStatus';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { agencyCode, adminCode, remember } = req.body;
  if (!agencyCode || !adminCode) return res.status(400).json({ error: 'Missing agency code or access code.' });
  const normalized = agencyCode.trim().toUpperCase();
  const identifier = `admin:${normalized}`;

  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  const { data: agency, error } = await supabaseAdmin
    .from('agencies')
    .select('id, name, admin_code_hash, manager_code_hash, status, plan_tier, billing_period, max_creators, trial_ends_at, referral_code, accent_color, stripe_current_period_end, stripe_cancel_at_period_end')
    .eq('agency_code', normalized)
    .single();

  if (error || !agency) { await recordFailure(identifier); return res.status(404).json({ error: 'No agency found with that code.' }); }

  // The single code field is checked against both hashes — the person
  // doesn't need to know whether they're "an admin" or "a manager", the
  // code they were given determines which role they get.
  const isAdmin = await bcrypt.compare(String(adminCode), agency.admin_code_hash);
  const isManager = !isAdmin && agency.manager_code_hash && await bcrypt.compare(String(adminCode), agency.manager_code_hash);

  if (!isAdmin && !isManager) { await recordFailure(identifier); return res.status(401).json({ error: 'Incorrect code.' }); }

  if (isLockedOut(agency.status)) {
    return res.status(402).json({ error: 'This agency\u2019s account is inactive. Contact the platform owner to reactivate.' });
  }

  await recordSuccess(identifier);
  const role = isAdmin ? 'admin' : 'manager';
  // Admin/manager sessions are short-lived (12h) by default since they're
  // more privileged than a creator session — but if they explicitly ask to
  // be remembered on this device, extend it to 30 days like a creator's.
  const duration = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  setSessionCookie(res, COOKIES.ADMIN, { agencyId: agency.id, role }, duration);
  setSessionCookie(res, COOKIES.AGENCY_SCOPE, { agencyId: agency.id }, duration);

  // If this agency has never set up an individual admin account, nudge
  // them toward it — the shared code still works (nothing breaks), but a
  // named, revocable login is safer once real money/PII is involved.
  let suggestConvert = false;
  if (isAdmin) {
    const { count } = await supabaseAdmin.from('agency_users').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id).eq('role', 'admin');
    suggestConvert = !count;
  }

  const { admin_code_hash, manager_code_hash, ...safeAgency } = agency;
  return res.status(200).json({ ...safeAgency, role, suggestConvert });
}
