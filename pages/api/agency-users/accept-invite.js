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
  if (!record || record.type !== 'invite') return res.status(400).json({ error: 'This invite link is invalid or has expired. Ask an admin to send a new one.' });

  const { data: existing } = await supabaseAdmin
    .from('agency_users').select('id').eq('agency_id', record.agency_id).eq('email', record.email).single();
  if (existing) { await consumeAuthToken(token); return res.status(409).json({ error: 'This account already exists — try logging in instead.' }); }

  const passwordHash = await hashPassword(password);
  const { error } = await supabaseAdmin.from('agency_users').insert({
    agency_id: record.agency_id, email: record.email, password_hash: passwordHash, role: record.role || 'manager'
  });
  if (error) return res.status(500).json({ error: 'Could not create your account. Try again.' });

  await consumeAuthToken(token);
  await logAudit(record.agency_id, record.email, 'Accepted invite and set password', null);

  return res.status(200).json({ email: record.email });
}
