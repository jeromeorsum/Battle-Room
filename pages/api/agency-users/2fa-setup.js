import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { generateTotpSetup } from '../../../lib/twoFactor';
import { verifyStillActive } from '../../../lib/verifyActiveSession';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (!session.agencyUserId) return res.status(400).json({ error: 'Set up an individual account first — 2FA isn\u2019t available on the shared code.' });
  if (!(await verifyStillActive(session))) return res.status(401).json({ error: 'Your account no longer has access — log in again.' });

  const { secret, qrDataUrl } = await generateTotpSetup(session.email);
  // Stored but NOT enabled yet — enabling only happens once they prove
  // they actually scanned it by submitting a valid code back.
  await supabaseAdmin.from('agency_users').update({ totp_secret: secret, totp_enabled: false }).eq('id', session.agencyUserId);

  return res.status(200).json({ qrDataUrl, secret });
}
