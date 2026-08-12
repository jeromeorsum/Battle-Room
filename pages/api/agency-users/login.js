import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { setSessionCookie, COOKIES } from '../../../lib/session';
import { checkLock, recordFailure, recordSuccess } from '../../../lib/rateLimit';
import { isLockedOut } from '../../../lib/agencyStatus';
import { verifyPassword } from '../../../lib/password';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { agencyCode, email, password, remember } = req.body;
  if (!agencyCode || !email || !password) return res.status(400).json({ error: 'Agency code, email, and password are all required.' });

  const normalizedCode = agencyCode.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  const identifier = `agencyuser:${normalizedCode}:${normalizedEmail}`;

  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  const { data: agency } = await supabaseAdmin
    .from('agencies').select('id, status').eq('agency_code', normalizedCode).single();
  if (!agency) { await recordFailure(identifier); return res.status(404).json({ error: 'No agency found with that code.' }); }

  if (isLockedOut(agency.status)) {
    return res.status(402).json({ error: 'This agency\u2019s account is inactive. Contact the platform owner to reactivate.' });
  }

  const { data: user } = await supabaseAdmin
    .from('agency_users').select('*').eq('agency_id', agency.id).eq('email', normalizedEmail).single();
  if (!user) { await recordFailure(identifier); return res.status(401).json({ error: 'Incorrect email or password.' }); }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) { await recordFailure(identifier); return res.status(401).json({ error: 'Incorrect email or password.' }); }

  await recordSuccess(identifier);

  const duration = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;

  if (user.totp_enabled) {
    // Password checked out, but a second factor is required — issue a
    // short-lived pending token (5 min) that only proves step 1 passed.
    // The real admin/agency-scope session cookies aren't set until the
    // TOTP code is verified in the next step.
    setSessionCookie(res, COOKIES.PENDING_2FA, { agencyUserId: user.id, agencyId: agency.id, role: user.role, remember: !!remember }, 60 * 5);
    return res.status(200).json({ requires2fa: true });
  }

  setSessionCookie(res, COOKIES.ADMIN, { agencyId: agency.id, role: user.role, agencyUserId: user.id, email: user.email }, duration);
  setSessionCookie(res, COOKIES.AGENCY_SCOPE, { agencyId: agency.id }, duration);
  await supabaseAdmin.from('agency_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

  return res.status(200).json({ role: user.role, email: user.email });
}
