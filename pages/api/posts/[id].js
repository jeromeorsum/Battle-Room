import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  const { id } = req.query;
  const { data: post, error: fetchErr } = await supabaseAdmin.from('posts').select('id, creator_id, agency_id').eq('id', id).single();
  if (fetchErr || !post) return res.status(404).json({ error: 'Post not found.' });

  const creatorSession = readSession(req, COOKIES.CREATOR);
  const adminSession = readSession(req, COOKIES.ADMIN);
  const isAuthor = creatorSession && creatorSession.creatorId === post.creator_id;
  const isAgencyAdmin = adminSession && adminSession.agencyId === post.agency_id;

  if (req.method === 'DELETE') {
    if (!isAuthor && !isAgencyAdmin) return res.status(403).json({ error: 'Not authorized to delete this post.' });
    const { error } = await supabaseAdmin.from('posts').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  if (req.method === 'PATCH') {
    // Anyone logged into the agency can report a post (not just the author) —
    // an admin then sees it flagged for review.
    if (!creatorSession && !adminSession) return res.status(401).json({ error: 'Log in first.' });
    const agencyId = creatorSession ? creatorSession.agencyId : adminSession.agencyId;
    if (agencyId !== post.agency_id) return res.status(403).json({ error: 'Not authorized.' });
    const { error } = await supabaseAdmin.from('posts').update({ reported: true }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end();
}
