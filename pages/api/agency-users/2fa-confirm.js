import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { verifyTotpCode } from '../../../lib/twoFactor';
import { logAudit } from '../../../lib/auditLog';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (!session.agencyUserId) return res.status(400).json({ error: 'Individual account required.' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Enter the 6-digit code from your authenticator app.' });

  const { data: user } = await supabaseAdmin.from('agency_users').select('totp_secret').eq('id', session.agencyUserId).single();
  if (!user?.totp_secret) return res.status(400).json({ error: 'Start setup again — no pending secret found.' });

  const valid = await verifyTotpCode(user.totp_secret, code);
  if (!valid) return res.status(401).json({ error: 'Incorrect code. Double check your authenticator app and try again.' });

  await supabaseAdmin.from('agency_users').update({ totp_enabled: true }).eq('id', session.agencyUserId);
  await logAudit(session.agencyId, session.email, 'Enabled two-factor authentication', null);

  return res.status(200).json({ enabled: true });
}
