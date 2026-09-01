import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../lib/session';
import { sendEmail } from '../../lib/emailAdmin';
import { logError } from '../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required.' });
  if (message.length > 2000) return res.status(400).json({ error: 'Keep it under 2000 characters.' });

  const creatorSession = readSession(req, COOKIES.CREATOR);
  const adminSession = readSession(req, COOKIES.ADMIN);
  const sessionAgencyId = creatorSession?.agencyId || adminSession?.agencyId || null;
  const submittedBy = creatorSession ? 'Creator' : adminSession ? `Agency ${adminSession.role}` : 'Anonymous';
  const clean = message.trim();

  // Resolve the agency once, and only keep the id if the agency still exists.
  // If the session points at a deleted agency, we save the feedback with no
  // agency rather than 500 on the foreign key — feedback should never be lost.
  let agencyId = null;
  let agencyName = 'None (not signed in)';
  if (sessionAgencyId) {
    const { data: ag } = await supabaseAdmin.from('agencies').select('id, name').eq('id', sessionAgencyId).single();
    if (ag) { agencyId = ag.id; agencyName = ag.name; }
  }

  const { error } = await supabaseAdmin.from('feedback_submissions').insert({
    agency_id: agencyId, submitted_by: submittedBy, message: clean
  });
  if (error) return res.status(500).json({ error: error.message });

  // Email the owner so feedback is noticed in real time. This must never block
  // or fail the submission — a mail problem is not the user's problem.
  try {
    const alertEmail = process.env.ADMIN_ALERT_EMAIL;
    if (alertEmail) {
      const escaped = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      await sendEmail({
        to: alertEmail,
        subject: `\uD83D\uDCAC New Battle Room Clash feedback (${submittedBy})`,
        html: `<p><b>From:</b> ${submittedBy}<br><b>Agency:</b> ${agencyName}</p>
               <blockquote style="border-left:3px solid #ffd447;padding-left:12px;margin:12px 0;white-space:pre-wrap;">${escaped}</blockquote>
               <p style="color:#888;font-size:12px;">You can also see all feedback in your Super Admin panel under the Feedback tab.</p>`
      });
    } else {
      await logError('feedback:no-alert-email', new Error('ADMIN_ALERT_EMAIL not set - feedback saved but no email sent.'));
    }
  } catch (err) {
    await logError('feedback:email', err);
  }

  return res.status(201).json({ ok: true });
}
