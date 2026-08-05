import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { setSessionCookie, COOKIES } from '../../lib/session';
import { checkLock, recordFailure, recordSuccess } from '../../lib/rateLimit';
import { isLockedOut } from '../../lib/agencyStatus';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { agencyCode, adminCode, remember } = req.body;
  if (!agencyCode || !adminCode) return res.status(400).json({ error: 'Missing agency code or admin code.' });
  const normalized = agencyCode.trim().toUpperCase();
  const identifier = `admin:${normalized}`;

  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  const { data: agency, error } = await supabaseAdmin
    .from('agencies')
    .select('id, name, admin_code_hash, status, plan_tier, billing_period, max_creators')
    .eq('agency_code', normalized)
    .single();

  if (error || !agency) { await recordFailure(identifier); return res.status(404).json({ error: 'No agency found with that code.' }); }

  const ok = await bcrypt.compare(String(adminCode), agency.admin_code_hash);
  if (!ok) { await recordFailure(identifier); return res.status(401).json({ error: 'Incorrect admin code.' }); }

  if (isLockedOut(agency.status)) {
    return res.status(402).json({ error: 'This agency\u2019s account is inactive. Contact the platform owner to reactivate.' });
  }

  await recordSuccess(identifier);
  // Admin sessions are short-lived (12h) by default since they're more
  // privileged than a creator session — but if the admin explicitly asks
  // to be remembered on this device, extend it to 30 days like a creator's.
  const duration = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  setSessionCookie(res, COOKIES.ADMIN, { agencyId: agency.id, role: 'admin' }, duration);
  setSessionCookie(res, COOKIES.AGENCY_SCOPE, { agencyId: agency.id }, duration);

  const { admin_code_hash, ...safeAgency } = agency;
  return res.status(200).json(safeAgency);
}
