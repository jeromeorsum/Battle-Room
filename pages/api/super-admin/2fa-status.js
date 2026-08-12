import { readSession, COOKIES } from '../../../lib/session';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });

  const { data: settings } = await supabaseAdmin.from('super_admin_2fa').select('totp_enabled').eq('id', 'singleton').single();
  return res.status(200).json({ enabled: !!settings?.totp_enabled });
}
