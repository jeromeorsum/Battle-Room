import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { logAudit } from '../../../lib/auditLog';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Only an admin can set the manager code.' });

  const { newCode } = req.body;
  if (!newCode || String(newCode).length < 8) return res.status(400).json({ error: 'Manager code must be at least 8 characters.' });

  // The manager code must NOT equal the admin code. If it did, anyone given the
  // "manager" code would actually log in as an admin (the login checks the admin
  // hash first), silently granting them billing/delete access the admin never
  // intended. Reject it so the role separation actually means something.
  const { data: ag } = await supabaseAdmin.from('agencies').select('admin_code_hash').eq('id', session.agencyId).single();
  if (ag && await bcrypt.compare(String(newCode), ag.admin_code_hash)) {
    return res.status(400).json({ error: 'The manager code must be different from your admin code — otherwise managers would get full admin access.' });
  }

  const manager_code_hash = await bcrypt.hash(String(newCode), 12);
  await supabaseAdmin.from('agencies').update({ manager_code_hash }).eq('id', session.agencyId);
  await logAudit(session.agencyId, 'Agency admin', 'Set/changed manager code');
  return res.status(200).json({ ok: true });
}
