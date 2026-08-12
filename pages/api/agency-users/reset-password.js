import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readAuthToken, consumeAuthToken } from '../../../lib/authTokens';
import { hashPassword, passwordIssue } from '../../../lib/password';
import { logAudit } from '../../../lib/auditLog';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Missing token or password.' });
  const issue = passwordIssue(password);
  if (issue) return res.status(400).json({ error: issue });

  const record = await readAuthToken(token);
  if (!record || record.type !== 'reset') return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' });

  const passwordHash = await hashPassword(password);
  await supabaseAdmin.from('agency_users').update({ password_hash: passwordHash }).eq('id', record.agency_user_id);
  await consumeAuthToken(token);
  await logAudit(record.agency_id, record.email, 'Reset password', null);

  return res.status(200).json({ reset: true });
}
