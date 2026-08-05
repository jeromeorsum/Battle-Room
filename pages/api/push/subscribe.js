import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  const session = readSession(req, COOKIES.CREATOR);
  if (!session) return res.status(401).json({ error: 'Log in first.' });

  if (req.method === 'POST') {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'Missing subscription.' });

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        creator_id: session.creatorId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }, { onConflict: 'creator_id,endpoint' });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    // Turns off notifications by removing every device subscription this
    // creator has saved — the browser-side unsubscribe happens separately
    // in pushClient.js, this just stops the server from trying to send.
    const { error } = await supabaseAdmin.from('push_subscriptions').delete().eq('creator_id', session.creatorId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['POST', 'DELETE']);
  return res.status(405).end();
}
