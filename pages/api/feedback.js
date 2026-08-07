import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required.' });
  if (message.length > 2000) return res.status(400).json({ error: 'Keep it under 2000 characters.' });

  const creatorSession = readSession(req, COOKIES.CREATOR);
  const adminSession = readSession(req, COOKIES.ADMIN);
  const agencyId = creatorSession?.agencyId || adminSession?.agencyId || null;
  const submittedBy = creatorSession ? 'Creator' : adminSession ? `Agency ${adminSession.role}` : 'Anonymous';

  const { error } = await supabaseAdmin.from('feedback_submissions').insert({
    agency_id: agencyId, submitted_by: submittedBy, message: message.trim()
  });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ ok: true });
}
