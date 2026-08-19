import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { notifyCreator } from '../../../lib/push';
import { logError } from '../../../lib/logger';

// Vercel Cron sends this header automatically; anything else must know
// CRON_SECRET. This route fires push notifications, so it's locked down.
function isAuthorized(req) {
  if (req.headers['x-vercel-cron']) return true;
  const auth = req.headers.authorization;
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

// How far ahead we remind. Meant to run every ~15 minutes; we look for
// confirmed battles starting within the next REMINDER_WINDOW_MIN minutes that
// we haven't already reminded about. Running frequently + the reminder_sent
// flag makes this idempotent: each battle is reminded exactly once.
const REMINDER_WINDOW_MIN = 60;

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Not authorized.' });

  const now = Date.now();
  const windowEnd = new Date(now + REMINDER_WINDOW_MIN * 60 * 1000).toISOString();
  const nowIso = new Date(now).toISOString();

  // Confirmed (both accepted, not declined), not already reminded, starting
  // between now and the window end.
  const { data: battles, error } = await supabaseAdmin
    .from('battles')
    .select('id, creator_a, creator_b, datetime_utc')
    .eq('accepted_a', true)
    .eq('accepted_b', true)
    .eq('declined', false)
    .eq('reminder_sent', false)
    .gte('datetime_utc', nowIso)
    .lte('datetime_utc', windowEnd);

  if (error) {
    await logError('cron/battle-reminders', error);
    return res.status(500).json({ error: error.message });
  }

  let reminded = 0;
  for (const b of battles || []) {
    try {
      const startsAt = new Date(b.datetime_utc);
      const minsAway = Math.max(1, Math.round((startsAt.getTime() - now) / 60000));
      const timeStr = startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      await Promise.all([b.creator_a, b.creator_b].filter(Boolean).map((id) => notifyCreator(id, {
        title: 'Your battle starts soon ⚔️',
        body: `You have a battle in about ${minsAway} min (${timeStr}). Get ready!`,
        url: '/app'
      })));
      // Mark reminded so we never double-notify, even if the cron overlaps.
      await supabaseAdmin.from('battles').update({ reminder_sent: true }).eq('id', b.id);
      reminded++;
    } catch (err) {
      await logError('cron/battle-reminders', err);
    }
  }

  return res.status(200).json({ checked: battles?.length || 0, reminded });
}
