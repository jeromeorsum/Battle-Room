import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/emailAdmin';
import { logError } from '../../../lib/logger';

// Vercel Cron sends this header automatically; anyone else calling this
// route without it (or without knowing CRON_SECRET) gets rejected — this
// route sends real emails, so it needs to be locked down.
function isAuthorized(req) {
  if (req.headers['x-vercel-cron']) return true; // Vercel's own cron invocation
  const auth = req.headers.authorization;
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Not authorized.' });

  const now = new Date();
  const { data: trialing } = await supabaseAdmin
    .from('agencies')
    .select('id, name, contact_email, trial_ends_at, trial_reminder_7_sent, trial_reminder_1_sent')
    .eq('status', 'trialing');

  let sent = 0;
  for (const agency of trialing || []) {
    if (!agency.trial_ends_at || !agency.contact_email) continue;
    const daysLeft = Math.ceil((new Date(agency.trial_ends_at) - now) / (24 * 60 * 60 * 1000));

    try {
      if (daysLeft <= 7 && daysLeft > 1 && !agency.trial_reminder_7_sent) {
        await sendEmail({
          to: agency.contact_email,
          subject: `Your Battle Room trial ends in ${daysLeft} days`,
          html: `<p>Hi ${agency.name},</p><p>Your free trial ends in ${daysLeft} days. Subscribe any time from the Settings tab in your admin panel to keep full access.</p>`
        });
        await supabaseAdmin.from('agencies').update({ trial_reminder_7_sent: true }).eq('id', agency.id);
        sent++;
      } else if (daysLeft <= 1 && !agency.trial_reminder_1_sent) {
        await sendEmail({
          to: agency.contact_email,
          subject: 'Your Battle Room trial ends tomorrow',
          html: `<p>Hi ${agency.name},</p><p>Your free trial ends tomorrow. After that, you'll still be able to view your roster and battles, but won't be able to add new creators, book battles, or post until you subscribe.</p>`
        });
        await supabaseAdmin.from('agencies').update({ trial_reminder_1_sent: true }).eq('id', agency.id);
        sent++;
      }
    } catch (err) {
      await logError('cron/trial-reminders', err);
    }
  }

  return res.status(200).json({ checked: trialing?.length || 0, sent });
}
