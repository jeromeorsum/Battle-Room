import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.AGENCY_SCOPE);
  if (!session) return res.status(401).json({ error: 'No agency scope.' });

  const { data: agency } = await supabaseAdmin.from('agencies').select('id, name').eq('id', session.agencyId).single();
  if (!agency) return res.status(401).json({ error: 'No agency scope.' });

  return res.status(200).json(agency);
}
