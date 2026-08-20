import webpush from 'web-push';
import { supabaseAdmin } from './supabaseAdmin';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    `mailto:${process.env.PUSH_CONTACT_EMAIL || 'admin@example.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

// Sends a push notification to every device a creator has subscribed on.
// Silently removes subscriptions that have expired or been revoked.
//
// This function NEVER throws: a notification is a side effect, so a push
// problem (e.g. VAPID keys not configured) must never break the core action
// that triggered it (booking a battle, accepting, etc.). Any failure is
// logged and swallowed.
export async function notifyCreator(creatorId, { title, body, url }) {
  try {
    ensureConfigured();

    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('creator_id', creatorId);

    if (error || !subs || subs.length === 0) return;

    const payload = JSON.stringify({ title, body, url: url || '/' });

    await Promise.all(
      subs.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        };
        try {
          await webpush.sendNotification(pushSubscription, payload);
        } catch (err) {
          // 404/410 means the browser unsubscribed or the subscription expired
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
          } else {
            console.error('Push send failed:', err.message);
          }
        }
      })
    );
  } catch (err) {
    // Never let a notification problem bubble up into the caller's flow.
    console.error('notifyCreator failed:', err && err.message);
  }
}
