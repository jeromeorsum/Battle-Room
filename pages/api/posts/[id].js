import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') { res.setHeader('Allow', ['DELETE']); return res.status(405).end(); }

  const { id } = req.query;
  const { data: post, error: fetchErr } = await supabaseAdmin.from('posts').select('id, creator_id, agency_id').eq('id', id).single();
  if (fetchErr || !post) return res.status(404).json({ error: 'Post not found.' });

  const creatorSession = readSession(req, COOKIES.CREATOR);
  const adminSession = readSession(req, COOKIES.ADMIN);
  const isAuthor = creatorSession && creatorSession.creatorId === post.creator_id;
  const isAgencyAdmin = adminSession && adminSession.agencyId === post.agency_id;
  if (!isAuthor && !isAgencyAdmin) return res.status(403).json({ error: 'Not authorized to delete this post.' });

  const { error } = await supabaseAdmin.from('posts').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).end();
}
