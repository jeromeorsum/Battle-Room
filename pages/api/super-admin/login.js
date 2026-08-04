import { setSessionCookie, COOKIES } from '../../../lib/session';
import { checkLock, recordFailure, recordSuccess } from '../../../lib/rateLimit';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }
  if (!process.env.SUPER_ADMIN_CODE) return res.status(500).json({ error: 'SUPER_ADMIN_CODE is not configured on the server.' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code.' });

  const identifier = 'superadmin';
  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  // Constant-time-ish comparison isn't critical here since this endpoint is
  // already rate-limited and lockable, but we still avoid a naive === on
  // attacker-controlled length by checking length first.
  const match = code.length === process.env.SUPER_ADMIN_CODE.length && code === process.env.SUPER_ADMIN_CODE;
  if (!match) { await recordFailure(identifier); return res.status(401).json({ error: 'Incorrect code.' }); }

  await recordSuccess(identifier);
  // Very short-lived (2 hours) since this is the most privileged role on the platform.
  setSessionCookie(res, COOKIES.SUPERADMIN, { role: 'superadmin' }, 60 * 60 * 2);
  return res.status(200).json({ ok: true });
}
