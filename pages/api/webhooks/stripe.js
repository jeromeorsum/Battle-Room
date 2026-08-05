import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { stripe } from '../../../lib/stripeAdmin';
import { logError } from '../../../lib/logger';

// Stripe needs the raw, unparsed request body to verify the webhook
// signature — Next.js parses JSON by default, so we turn that off here.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Maps Stripe's own subscription status to our agency status field.
function mapStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return 'past_due';
  if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') return 'canceled';
  return null; // unknown status — don't touch it
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    await logError('webhooks/stripe:signature', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const agencyId = session.metadata?.agencyId;
        const planTier = session.metadata?.planTier;
        const billingPeriod = session.metadata?.billingPeriod;
        if (agencyId) {
          await supabaseAdmin.from('agencies').update({
            status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            ...(planTier ? { plan_tier: planTier } : {}),
            ...(billingPeriod ? { billing_period: billingPeriod } : {})
          }).eq('id', agencyId);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = mapStatus(sub.status);
        if (status) {
          await supabaseAdmin.from('agencies').update({ status }).eq('stripe_subscription_id', sub.id);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        // This is what makes cancellation automatic: whether the agency
        // cancels themselves via the billing portal, or Stripe cancels
        // after repeated failed payments, this event fires either way —
        // no one has to remember to click a "cut off" button.
        await supabaseAdmin.from('agencies').update({ status: 'canceled' }).eq('stripe_subscription_id', sub.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await supabaseAdmin.from('agencies').update({ status: 'past_due' }).eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }
      default:
        break; // ignore events we don't care about
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    await logError(`webhooks/stripe:${event.type}`, err);
    return res.status(500).json({ error: 'Webhook handler failed.' });
  }

  return res.status(200).json({ received: true });
}
