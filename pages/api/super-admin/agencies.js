import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session || session.role !== 'superadmin') return res.status(401).json({ error: 'Not authorized.' });

  if (req.method === 'GET') {
    const { data: agencies, error } = await supabaseAdmin
      .from('agencies')
      .select('id, name, agency_code, contact_email, contact_phone, plan_tier, billing_period, status, max_creators, created_at')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const withCounts = await Promise.all(agencies.map(async (a) => {
      const { count } = await supabaseAdmin.from('creators').select('id', { count: 'exact', head: true }).eq('agency_id', a.id);
      return { ...a, creatorCount: count || 0 };
    }));

    return res.status(200).json(withCounts);
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end();
}
