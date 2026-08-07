import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../../lib/session';
import { logAudit } from '../../../../lib/auditLog';

export default async function handler(req, res) {
  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session || session.role !== 'superadmin') return res.status(401).json({ error: 'Not authorized.' });

  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { plan_tier, billing_period, status, max_creators } = req.body;
    const update = {};
    if (plan_tier !== undefined) update.plan_tier = plan_tier;
    if (billing_period !== undefined) update.billing_period = billing_period;
    if (status !== undefined) update.status = status;
    if (max_creators !== undefined) update.max_creators = max_creators;

    const { data, error } = await supabaseAdmin.from('agencies').update(update).eq('id', id).select('*').single();
    if (error) return res.status(500).json({ error: error.message });
    const changes = Object.entries(update).map(([k, v]) => `${k}=${v}`).join(', ');
    await logAudit(id, 'Platform (super admin)', 'Updated agency settings', changes);
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin.from('agencies').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end();
}
