import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { verifyPassword } from '../../../lib/password';
import { logAudit } from '../../../lib/auditLog';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (!session.agencyUserId) return res.status(400).json({ error: 'Individual account required.' });

  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Enter your password to confirm.' });

  const { data: user } = await supabaseAdmin.from('agency_users').select('password_hash').eq('id', session.agencyUserId).single();
  const ok = user && await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect password.' });

  await supabaseAdmin.from('agency_users').update({ totp_enabled: false, totp_secret: null }).eq('id', session.agencyUserId);
  await logAudit(session.agencyId, session.email, 'Disabled two-factor authentication', null);

  return res.status(200).json({ disabled: true });
}
