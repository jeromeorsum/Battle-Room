import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { agencyId, token, newCode } = req.body;
  if (!agencyId || !token || !newCode) return res.status(400).json({ error: 'Missing information.' });
  if (String(newCode).length < 8) return res.status(400).json({ error: 'New admin code must be at least 8 characters.' });

  const { data: resets } = await supabaseAdmin
    .from('password_resets')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  let matched = null;
  for (const r of resets || []) {
    if (await bcrypt.compare(token, r.token_hash)) { matched = r; break; }
  }
  if (!matched) return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' });

  const admin_code_hash = await bcrypt.hash(String(newCode), 12);
  await supabaseAdmin.from('agencies').update({ admin_code_hash }).eq('id', agencyId);
  await supabaseAdmin.from('password_resets').update({ used: true }).eq('id', matched.id);

  return res.status(200).json({ ok: true });
}
