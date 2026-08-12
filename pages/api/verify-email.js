import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readAuthToken, consumeAuthToken } from '../../lib/authTokens';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token.' });

  const record = await readAuthToken(token);
  if (!record || record.type !== 'email_verify') return res.status(400).json({ error: 'This verification link is invalid or has expired.' });

  await supabaseAdmin.from('agencies').update({ contact_email_verified: true }).eq('id', record.agency_id);
  await consumeAuthToken(token);

  return res.status(200).json({ verified: true });
}
