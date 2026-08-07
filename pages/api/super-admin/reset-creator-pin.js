import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { logAudit } from '../../../lib/auditLog';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session || session.role !== 'superadmin') return res.status(401).json({ error: 'Not authorized.' });

  const { creatorId, newPin } = req.body;
  if (!creatorId || !newPin || String(newPin).length < 6) return res.status(400).json({ error: 'Creator and a new PIN (6+ characters) are required.' });

  const { data: victim } = await supabaseAdmin.from('creators').select('name, agency_id').eq('id', creatorId).single();
  const pin_hash = await bcrypt.hash(String(newPin), 12);
  const { error } = await supabaseAdmin.from('creators').update({ pin_hash }).eq('id', creatorId);
  if (error) return res.status(500).json({ error: error.message });
  if (victim) await logAudit(victim.agency_id, 'Platform (super admin)', 'Reset creator PIN', victim.name);
  return res.status(200).json({ ok: true });
}
