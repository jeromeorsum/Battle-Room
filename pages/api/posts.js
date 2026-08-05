import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../lib/session';
import { canWrite } from '../../lib/agencyStatus';
import { containsBlockedContent } from '../../lib/moderation';
import { resolveAgencyId } from '../../lib/agencyScope';

export default async function handler(req, res) {
  const creatorSession = readSession(req, COOKIES.CREATOR);
  const agencyId = resolveAgencyId(req);
  if (!agencyId) return res.status(401).json({ error: 'Enter your agency code first.' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('id, creator_id, message, reported, created_at, creators(name, handle, avatar_url)')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!creatorSession) return res.status(401).json({ error: 'Log in first.' });

    const { data: agency } = await supabaseAdmin.from('agencies').select('status').eq('id', creatorSession.agencyId).single();
    if (!canWrite(agency?.status)) return res.status(402).json({ error: 'This agency\u2019s subscription is inactive. Contact your agency admin.' });

    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required.' });
    if (message.length > 280) return res.status(400).json({ error: 'Keep it under 280 characters.' });
    if (containsBlockedContent(message)) return res.status(400).json({ error: 'That message isn\u2019t allowed — please rephrase.' });

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({ agency_id: creatorSession.agencyId, creator_id: creatorSession.creatorId, message: message.trim() })
      .select('id, creator_id, message, created_at')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
