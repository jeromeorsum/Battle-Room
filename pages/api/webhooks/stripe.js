import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { stripe } from '../../../lib/stripeAdmin';
import { logError } from '../../../lib/logger';
import { tierById } from '../../../lib/pricing';
import { logAudit } from '../../../lib/auditLog';
import { sendEmail } from '../../../lib/emailAdmin';

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

          // Referral reward: if this agency was referred, and this specific
          // referral hasn't already paid out, credit the referrer a free
          // month via Stripe's customer balance — it's automatically
          // applied to their next invoice. Without the claimed-at guard
          // below, this fires again on every future checkout for the same
          // agency (a deliberate cancel-then-resubscribe, or even just
          // Stripe retrying webhook delivery, which it explicitly does),
          // paying the referrer out repeatedly for a single referral.
          const { data: referredAgency } = await supabaseAdmin
            .from('agencies').select('referred_by_code, referral_reward_claimed_at, plan_tier, billing_period').eq('id', agencyId).single();
          if (referredAgency?.referred_by_code && !referredAgency.referral_reward_claimed_at) {
            const { data: referrer } = await supabaseAdmin
              .from('agencies').select('id, stripe_customer_id, plan_tier, billing_period')
              .eq('referral_code', referredAgency.referred_by_code).single();
            if (referrer?.stripe_customer_id) {
              // Claim it first, and only if still unclaimed (WHERE guards
              // against a second webhook delivery racing this same one) —
              // if the claim doesn't stick, someone else already paid this
              // reward out, so skip crediting again.
              const { data: claimed } = await supabaseAdmin
                .from('agencies').update({ referral_reward_claimed_at: new Date().toISOString() })
                .eq('id', agencyId).is('referral_reward_claimed_at', null).select('id');
              if (claimed && claimed.length) {
                const referrerTier = tierById(referrer.plan_tier);
                const rewardAmount = referrer.billing_period === 'yearly' ? referrerTier.yearly : referrerTier.monthly;
                if (rewardAmount) {
                  await stripe.customers.createBalanceTransaction(referrer.stripe_customer_id, {
                    amount: -Math.round(rewardAmount * 100), // negative = credit, Stripe uses cents
                    currency: 'usd',
                    description: 'Referral reward — referred agency subscribed'
                  });
                  await logAudit(referrer.id, 'System', 'Referral reward credited', `$${rewardAmount} credit for referring a new paying agency`);
                }
              }
            }
          }
        }
        break;
      }
      case 'customer.subscription.trial_will_end': {
        // Stripe fires this ~3 days before a trial converts to paid. Sending
        // a reminder that names the amount, the date, and how to cancel is
        // the FTC/Idaho-recommended practice for a free trial that
        // auto-renews into a paid plan (notify 1–7 days before the charge).
        const sub = event.data.object;
        try {
          const { data: agency } = await supabaseAdmin
            .from('agencies').select('id, name, contact_email, plan_tier').eq('stripe_subscription_id', sub.id).single();
          if (agency?.contact_email) {
            const tier = tierById(agency.plan_tier);
            const amount = tier?.monthly ? `$${tier.monthly}` : 'your plan price';
            const chargeDate = sub.trial_end
              ? new Date(sub.trial_end * 1000).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
              : 'soon';
            await sendEmail({
              to: agency.contact_email,
              subject: `Your Battle Room Clash free trial ends soon — ${amount}/month starts ${chargeDate}`,
              html: `<p>Hi ${agency.name},</p>
                     <p>Your 14-day Battle Room Clash free trial is ending. Unless you cancel first, your ${tier?.label || ''} subscription will begin and your card will be charged <b>${amount}</b> on <b>${chargeDate}</b>, then ${amount} each month until you cancel.</p>
                     <p>If you'd like to keep Battle Room Clash, you don't need to do anything — it'll continue automatically.</p>
                     <p>If you'd rather not be charged, you can cancel for free anytime before ${chargeDate} in your admin billing settings, or by replying to this email and asking us to cancel. Either way, cancelling during the trial means no charge.</p>
                     <p>Thanks for trying Battle Room Clash.</p>`
            });
            await logAudit(agency.id, 'System', 'Trial-ending reminder sent', `Charge of ${amount} scheduled for ${chargeDate}`);
          }
        } catch (err) {
          await logError('webhook:trial_will_end', err);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = mapStatus(sub.status);
        // Stripe's subscription.status stays 'active' the whole time
        // someone is in a "cancels at period end" grace window — it only
        // flips once the period actually ends (which fires
        // subscription.deleted below). So access naturally continues
        // through the paid-for period already; this just captures the
        // date/flag so we can *show* the countdown to the agency and to
        // super admin.
        const update = {
          stripe_current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          stripe_cancel_at_period_end: !!sub.cancel_at_period_end
        };
        if (status) update.status = status;
        await supabaseAdmin.from('agencies').update(update).eq('stripe_subscription_id', sub.id);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        // This is what makes cancellation automatic: whether the agency
        // cancels themselves via the billing portal, or Stripe cancels
        // after repeated failed payments, this event fires either way —
        // no one has to remember to click a "cut off" button.
        await supabaseAdmin.from('agencies').update({ status: 'canceled', stripe_cancel_at_period_end: false }).eq('stripe_subscription_id', sub.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await supabaseAdmin.from('agencies').update({ status: 'past_due' }).eq('stripe_subscription_id', invoice.subscription);
          // Tell the owner so they can fix it — otherwise their account goes
          // read-restricted silently and they churn without knowing why.
          try {
            const { data: agency } = await supabaseAdmin
              .from('agencies').select('id, name, contact_email').eq('stripe_subscription_id', invoice.subscription).single();
            if (agency?.contact_email) {
              const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.battleroomclash.com';
              await sendEmail({
                to: agency.contact_email,
                subject: 'Action needed: your Battle Room Clash payment didn\u2019t go through',
                html: `<p>Hi ${agency.name},</p>
                       <p>We tried to charge your card for your Battle Room Clash subscription, but the payment didn\u2019t go through. Your account is now limited until it\u2019s resolved.</p>
                       <p>To fix it, update your payment method in your admin billing settings and we\u2019ll retry the charge:</p>
                       <p><a href="${origin}/admin">Open billing settings</a></p>
                       <p>If you think this is a mistake, just reply to this email and we\u2019ll help.</p>`
              });
              await logAudit(agency.id, 'System', 'Payment failed', 'Subscription payment failed; account set to past_due and owner notified');
            }
          } catch (err) {
            await logError('webhook:payment_failed_email', err);
          }
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
