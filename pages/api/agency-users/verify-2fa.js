import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, setSessionCookie, clearSessionCookie, COOKIES } from '../../../lib/session';
import { checkLock, recordFailure, recordSuccess } from '../../../lib/rateLimit';
import { verifyTotpCode } from '../../../lib/twoFactor';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const pending = readSession(req, COOKIES.PENDING_2FA);
  if (!pending) return res.status(401).json({ error: 'Your login attempt expired. Please log in again.' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Enter the 6-digit code from your authenticator app.' });

  const identifier = `2fa:${pending.agencyUserId}`;
  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  const { data: user } = await supabaseAdmin.from('agency_users').select('*').eq('id', pending.agencyUserId).single();
  if (!user || !user.totp_enabled) return res.status(401).json({ error: 'Two-factor is not set up on this account.' });

  const valid = await verifyTotpCode(user.totp_secret, code);
  if (!valid) { await recordFailure(identifier); return res.status(401).json({ error: 'Incorrect code.' }); }

  await recordSuccess(identifier);
  clearSessionCookie(res, COOKIES.PENDING_2FA);

  const duration = pending.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  setSessionCookie(res, COOKIES.ADMIN, { agencyId: pending.agencyId, role: pending.role, agencyUserId: user.id, email: user.email }, duration);
  setSessionCookie(res, COOKIES.AGENCY_SCOPE, { agencyId: pending.agencyId }, duration);
  await supabaseAdmin.from('agency_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

  return res.status(200).json({ role: user.role, email: user.email });
}
