import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { logAudit } from '../../../lib/auditLog';

// Whether the plain shared agency code still works for creators to join, in
// addition to single-use invites. ADMIN ONLY — a manager can generate invites
// but can't change this security setting for the agency.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Only an admin can change how creators join this agency.' });

  const { allow } = req.body || {};
  if (typeof allow !== 'boolean') return res.status(400).json({ error: 'Missing on/off value.' });

  const { error } = await supabaseAdmin
    .from('agencies').update({ allow_shared_code: allow }).eq('id', session.agencyId);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(session.agencyId, 'Admin', 'Changed join settings', `Shared agency code ${allow ? 'enabled' : 'disabled'} for joining`);
  return res.status(200).json({ ok: true, allow_shared_code: allow });
}
