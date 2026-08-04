import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.CREATOR);
  if (!session) return res.status(401).json({ error: 'Not logged in.' });

  const { data: creator } = await supabaseAdmin.from('creators').select('id, name, agency_id').eq('id', session.creatorId).single();
  if (!creator) return res.status(401).json({ error: 'Not logged in.' });

  const { data: agency } = await supabaseAdmin.from('agencies').select('id, name').eq('id', creator.agency_id).single();
  return res.status(200).json({ creatorId: creator.id, name: creator.name, agencyId: creator.agency_id, agencyName: agency ? agency.name : '' });
}
