import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { logAudit } from '../../../lib/auditLog';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') { res.setHeader('Allow', ['DELETE']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (session.role !== 'admin' && session.role !== 'manager') return res.status(403).json({ error: 'Not authorized.' });

  const { id } = req.query;

  // Only revoke an invite that belongs to this agency and hasn't been used.
  // A redeemed invite is history — you can't un-redeem it.
  const { data: invite } = await supabaseAdmin
    .from('creator_invites').select('id, agency_id, status').eq('id', id).single();
  if (!invite || invite.agency_id !== session.agencyId) return res.status(404).json({ error: 'Invite not found.' });
  if (invite.status === 'redeemed') return res.status(400).json({ error: 'That invite was already used and can\u2019t be revoked.' });

  const { error } = await supabaseAdmin
    .from('creator_invites').update({ status: 'revoked' }).eq('id', id).eq('agency_id', session.agencyId);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(session.agencyId, session.role === 'admin' ? 'Admin' : 'Manager', 'Revoked invite', `Invite ${id}`);
  return res.status(200).json({ ok: true });
}
