import { readSession, COOKIES } from '../../../lib/session';
import { generateTotpSetup } from '../../../lib/twoFactor';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });

  const { secret, qrDataUrl } = await generateTotpSetup('Super Admin — Battle Room');
  await supabaseAdmin.from('super_admin_2fa').update({ totp_secret: secret, totp_enabled: false, updated_at: new Date().toISOString() }).eq('id', 'singleton');

  return res.status(200).json({ qrDataUrl });
}
