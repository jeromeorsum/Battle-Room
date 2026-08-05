import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session || session.role !== 'superadmin') return res.status(401).json({ error: 'Not authorized.' });

  const { agencyId } = req.query;
  if (!agencyId) return res.status(400).json({ error: 'Missing agencyId.' });

  const { data, error } = await supabaseAdmin
    .from('creators').select('id, name, handle').eq('agency_id', agencyId).order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
