import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const [{ count: agencyCount }, { count: creatorCount }, { count: battleCount }] = await Promise.all([
    supabaseAdmin.from('agencies').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('creators').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('battles').select('id', { count: 'exact', head: true }).eq('accepted_a', true).eq('accepted_b', true)
  ]);

  return res.status(200).json({
    agencies: agencyCount || 0,
    creators: creatorCount || 0,
    battles: battleCount || 0
  });
}
