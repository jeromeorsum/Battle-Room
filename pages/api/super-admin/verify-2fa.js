import { readSession, setSessionCookie, clearSessionCookie, COOKIES } from '../../../lib/session';
import { checkLock, recordFailure, recordSuccess } from '../../../lib/rateLimit';
import { verifyTotpCode } from '../../../lib/twoFactor';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const pending = readSession(req, COOKIES.SUPERADMIN_PENDING_2FA);
  if (!pending) return res.status(401).json({ error: 'Your login attempt expired. Please log in again.' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Enter the 6-digit code from your authenticator app.' });

  const identifier = 'superadmin-2fa';
  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  const { data: settings } = await supabaseAdmin.from('super_admin_2fa').select('totp_secret, totp_enabled').eq('id', 'singleton').single();
  if (!settings?.totp_enabled) return res.status(401).json({ error: 'Two-factor is not enabled.' });

  const valid = await verifyTotpCode(settings.totp_secret, code);
  if (!valid) { await recordFailure(identifier); return res.status(401).json({ error: 'Incorrect code.' }); }

  await recordSuccess(identifier);
  clearSessionCookie(res, COOKIES.SUPERADMIN_PENDING_2FA);
  setSessionCookie(res, COOKIES.SUPERADMIN, { role: 'superadmin' }, 60 * 60 * 2);
  return res.status(200).json({ ok: true });
}
