import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });

  const { currentCode, newCode } = req.body;
  if (!newCode || String(newCode).length < 8) return res.status(400).json({ error: 'New admin code must be at least 8 characters.' });

  const { data: agency } = await supabaseAdmin.from('agencies').select('admin_code_hash').eq('id', session.agencyId).single();
  if (!agency) return res.status(404).json({ error: 'Agency not found.' });

  const ok = await bcrypt.compare(String(currentCode || ''), agency.admin_code_hash);
  if (!ok) return res.status(401).json({ error: 'Current admin code is incorrect.' });

  const admin_code_hash = await bcrypt.hash(String(newCode), 12);
  await supabaseAdmin.from('agencies').update({ admin_code_hash }).eq('id', session.agencyId);
  return res.status(200).json({ ok: true });
}
