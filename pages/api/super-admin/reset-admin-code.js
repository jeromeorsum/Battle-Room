import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session || session.role !== 'superadmin') return res.status(401).json({ error: 'Not authorized.' });

  const { agencyId, newCode } = req.body;
  if (!agencyId || !newCode || String(newCode).length < 8) return res.status(400).json({ error: 'Agency and a new code (8+ characters) are required.' });

  const admin_code_hash = await bcrypt.hash(String(newCode), 12);
  const { error } = await supabaseAdmin.from('agencies').update({ admin_code_hash }).eq('id', agencyId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
