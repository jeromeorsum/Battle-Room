import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { stripe } from '../../../lib/stripeAdmin';
import { sendEmail } from '../../../lib/emailAdmin';
import { logError } from '../../../lib/logger';

// Same auth pattern as trial-reminders.js — Vercel Cron calls this
// automatically with its own header, or you (or GitHub Actions) can call
// it manually with `Authorization: Bearer <CRON_SECRET>`.
function isAuthorized(req) {
  if (req.headers['x-vercel-cron']) return true;
  const auth = req.headers.authorization;
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

// Mirrors the same status mapping used in pages/api/webhooks/stripe.js —
// kept in sync manually since it's a small pure function. If you ever
// change one, change the other.
function mapStripeStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return 'past_due';
  if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') return 'canceled';
  return null;
}

async function fetchAllStripeSubscriptions() {
  const subs = [];
  let startingAfter;
  // Stripe paginates 100 at a time — loop until there's no more pages.
  for (;;) {
    const page = await stripe.subscriptions.list({
      limit: 100,
      status: 'all',
      starting_after: startingAfter
    });
    subs.push(...page.data);
    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return subs;
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Not authorized.' });

  const issues = [];

  try {
    // Pull every agency that's supposed to have a Stripe subscription
    // (i.e. not still on a free trial with no card on file).
    const { data: agencies, error } = await supabaseAdmin
      .from('agencies')
      .select('id, name, status, stripe_customer_id, stripe_subscription_id')
      .neq('status', 'trialing');
    if (error) throw error;

    const stripeSubs = await fetchAllStripeSubscriptions();
    const subsById = new Map(stripeSubs.map((s) => [s.id, s]));

    // Check 1: every agency with a subscription ID should match what
    // Stripe actually says about that subscription right now.
    for (const agency of agencies || []) {
      if (!agency.stripe_subscription_id) {
        // An agency marked active/past_due/canceled with NO subscription ID
        // on file is itself suspicious — flag it.
        issues.push({
          type: 'missing_subscription_id',
          agencyId: agency.id,
          agencyName: agency.name,
          detail: `Agency status is "${agency.status}" but has no stripe_subscription_id on file.`
        });
        continue;
      }

      const sub = subsById.get(agency.stripe_subscription_id);
      if (!sub) {
        issues.push({
          type: 'subscription_not_found_in_stripe',
          agencyId: agency.id,
          agencyName: agency.name,
          detail: `Agency references stripe_subscription_id ${agency.stripe_subscription_id}, but Stripe has no such subscription.`
        });
        continue;
      }

      const expectedStatus = mapStripeStatus(sub.status);
      if (expectedStatus && expectedStatus !== agency.status) {
        issues.push({
          type: 'status_mismatch',
          agencyId: agency.id,
          agencyName: agency.name,
          detail: `Supabase says "${agency.status}", but Stripe subscription ${sub.id} is "${sub.status}" (expected agency status "${expectedStatus}").`
        });
      }
    }

    // Check 2: every Stripe subscription that looks like a real paying
    // customer should map back to SOME agency. An orphaned subscription
    // (charging someone with no matching account) is the worst-case bug.
    const knownSubIds = new Set((agencies || []).map((a) => a.stripe_subscription_id).filter(Boolean));
    for (const sub of stripeSubs) {
      if (sub.status === 'canceled') continue; // don't bother flagging old canceled ones
      if (!knownSubIds.has(sub.id)) {
        issues.push({
          type: 'orphaned_stripe_subscription',
          agencyId: null,
          agencyName: null,
          detail: `Stripe subscription ${sub.id} (customer ${sub.customer}, status "${sub.status}") does not match any agency in Supabase.`
        });
      }
    }
  } catch (err) {
    await logError('cron/stripe-reconcile', err);
    return res.status(500).json({ error: 'Reconciliation failed to run.', message: err.message });
  }

  // Only email if something's actually wrong — no daily "all clear" spam.
  if (issues.length > 0) {
    const alertEmail = process.env.ADMIN_ALERT_EMAIL;
    const html = `
      <h2>Stripe ⇄ Supabase reconciliation found ${issues.length} issue(s)</h2>
      <ul>
        ${issues.map((i) => `<li><strong>${i.type}</strong>${i.agencyName ? ` — ${i.agencyName}` : ''}: ${i.detail}</li>`).join('')}
      </ul>
      <p>Run at ${new Date().toISOString()}.</p>
    `;
    if (alertEmail) {
      try {
        await sendEmail({ to: alertEmail, subject: `⚠️ Billing reconciliation: ${issues.length} issue(s) found`, html });
      } catch (err) {
        // If email itself fails, at least make sure it's not silent —
        // logError writes to Supabase's error_logs table too.
        await logError('cron/stripe-reconcile:email', err);
      }
    } else {
      await logError('cron/stripe-reconcile:no-admin-email', new Error('ADMIN_ALERT_EMAIL is not set — issues found but no email sent. Set ADMIN_ALERT_EMAIL in Vercel env vars.'));
    }
  }

  return res.status(200).json({ checkedAt: new Date().toISOString(), issuesFound: issues.length, issues });
}
