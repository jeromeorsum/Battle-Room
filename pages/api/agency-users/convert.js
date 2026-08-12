import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, setSessionCookie, COOKIES } from '../../../lib/session';
import { hashPassword, passwordIssue } from '../../../lib/password';
import { logAudit } from '../../../lib/auditLog';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Only an admin can set this up.' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const issue = passwordIssue(password);
  if (issue) return res.status(400).json({ error: issue });

  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing } = await supabaseAdmin
    .from('agency_users').select('id').eq('agency_id', session.agencyId).eq('email', normalizedEmail).single();
  if (existing) return res.status(409).json({ error: 'That email is already registered on this agency.' });

  const passwordHash = await hashPassword(password);
  const { data: user, error } = await supabaseAdmin
    .from('agency_users')
    .insert({ agency_id: session.agencyId, email: normalizedEmail, password_hash: passwordHash, role: 'admin' })
    .select().single();
  if (error || !user) return res.status(500).json({ error: 'Could not create your account. Try again.' });

  // Upgrade the current session in place so they don't have to log back
  // in — same access, now tied to their individual account going forward.
  const duration = 60 * 60 * 12;
  setSessionCookie(res, COOKIES.ADMIN, { agencyId: session.agencyId, role: 'admin', agencyUserId: user.id, email: user.email }, duration);

  await logAudit(session.agencyId, user.email, 'Converted shared admin code to individual account', null);

  return res.status(200).json({ email: user.email });
}
