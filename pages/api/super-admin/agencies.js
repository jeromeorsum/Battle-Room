import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session || session.role !== 'superadmin') return res.status(401).json({ error: 'Not authorized.' });

  if (req.method === 'GET') {
    const { data: agencies, error } = await supabaseAdmin
      .from('agencies')
      .select('id, name, agency_code, contact_email, contact_phone, plan_tier, billing_period, status, max_creators, created_at, stripe_current_period_end, stripe_cancel_at_period_end')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    // One query for all creator counts instead of one query per agency —
    // matters once there are dozens/hundreds of agencies, not just a couple.
    const { data: allCreators } = await supabaseAdmin.from('creators').select('agency_id');
    const counts = {};
    (allCreators || []).forEach((c) => { counts[c.agency_id] = (counts[c.agency_id] || 0) + 1; });
    const withCounts = agencies.map((a) => ({ ...a, creatorCount: counts[a.id] || 0 }));

    return res.status(200).json(withCounts);
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end();
}
