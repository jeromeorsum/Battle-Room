import { readSession, COOKIES } from '../../../lib/session';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Enter your super admin code to confirm.' });
  const match = code.length === process.env.SUPER_ADMIN_CODE.length && code === process.env.SUPER_ADMIN_CODE;
  if (!match) return res.status(401).json({ error: 'Incorrect code.' });

  await supabaseAdmin.from('super_admin_2fa').update({ totp_enabled: false, totp_secret: null, updated_at: new Date().toISOString() }).eq('id', 'singleton');
  return res.status(200).json({ disabled: true });
}
