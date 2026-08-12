import { readSession, COOKIES } from '../../../lib/session';
import { verifyTotpCode } from '../../../lib/twoFactor';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Enter the 6-digit code from your authenticator app.' });

  const { data: settings } = await supabaseAdmin.from('super_admin_2fa').select('totp_secret').eq('id', 'singleton').single();
  if (!settings?.totp_secret) return res.status(400).json({ error: 'Start setup again — no pending secret found.' });

  const valid = await verifyTotpCode(settings.totp_secret, code);
  if (!valid) return res.status(401).json({ error: 'Incorrect code. Double check your authenticator app and try again.' });

  await supabaseAdmin.from('super_admin_2fa').update({ totp_enabled: true, updated_at: new Date().toISOString() }).eq('id', 'singleton');
  return res.status(200).json({ enabled: true });
}
