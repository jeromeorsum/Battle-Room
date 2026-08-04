import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.CREATOR);
  if (!session) return res.status(401).json({ error: 'Log in first.' });

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
