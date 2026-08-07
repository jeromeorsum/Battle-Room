import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../lib/session';
import { stripe } from '../../lib/stripeAdmin';
import { priceIdFor } from '../../lib/priceMap';
import { logError } from '../../lib/logger';
import { verifyBillingCode } from '../../lib/billingVerify';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Only an admin can do this — managers don\'t have access to billing.' });

  const { planTier, billingPeriod, verificationCode } = req.body;
  const codeOk = await verifyBillingCode(session.agencyId, verificationCode);
  if (!codeOk) return res.status(401).json({ error: 'Invalid or expired verification code. Request a new one.' });

  const priceId = priceIdFor(planTier, billingPeriod);
  if (!priceId) return res.status(400).json({ error: 'That plan isn\u2019t configured with a Stripe Price ID yet. See STRIPE_SETUP.md.' });

  try {
    const { data: agency } = await supabaseAdmin
      .from('agencies').select('id, name, contact_email, stripe_customer_id').eq('id', session.agencyId).single();
    if (!agency) return res.status(404).json({ error: 'Agency not found.' });

    let customerId = agency.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agency.contact_email || undefined,
        name: agency.name,
        metadata: { agencyId: agency.id }
      });
      customerId = customer.id;
      await supabaseAdmin.from('agencies').update({ stripe_customer_id: customerId }).eq('id', agency.id);
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/admin?checkout=success`,
      cancel_url: `${origin}/admin?checkout=cancel`,
      metadata: { agencyId: agency.id, planTier, billingPeriod }
    });

    return res.status(200).json({ url: checkoutSession.url });
  } catch (err) {
    await logError('checkout', err);
    return res.status(500).json({ error: 'Could not start checkout. Check your Stripe configuration.' });
  }
}
