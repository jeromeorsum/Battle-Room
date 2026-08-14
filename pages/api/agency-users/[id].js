import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { logAudit } from '../../../lib/auditLog';
import { verifyStillActive } from '../../../lib/verifyActiveSession';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') { res.setHeader('Allow', ['DELETE']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Only an admin can remove team members.' });
  if (!(await verifyStillActive(session))) return res.status(401).json({ error: 'Your account no longer has access — log in again.' });

  const { id } = req.query;
  const { data: target } = await supabaseAdmin.from('agency_users').select('id, email, role, agency_id').eq('id', id).single();
  if (!target || target.agency_id !== session.agencyId) return res.status(404).json({ error: 'Not found.' });

  if (target.role === 'admin') {
    const { count } = await supabaseAdmin.from('agency_users').select('id', { count: 'exact', head: true }).eq('agency_id', session.agencyId).eq('role', 'admin');
    if (count <= 1) return res.status(400).json({ error: 'Can\u2019t remove the last admin account. Invite another admin first, or use the shared admin code as a fallback.' });
  }

  await supabaseAdmin.from('agency_users').delete().eq('id', id);
  await logAudit(session.agencyId, session.email || 'Admin (shared code)', `Removed team member ${target.email}`, null);

  return res.status(200).json({ removed: true });
}
