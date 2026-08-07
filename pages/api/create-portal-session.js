import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../lib/session';
import { stripe } from '../../lib/stripeAdmin';
import { verifyBillingCode } from '../../lib/billingVerify';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Only an admin can do this — managers don\'t have access to billing.' });

  const { verificationCode } = req.body;
  const codeOk = await verifyBillingCode(session.agencyId, verificationCode);
  if (!codeOk) return res.status(401).json({ error: 'Invalid or expired verification code. Request a new one.' });

  const { data: agency } = await supabaseAdmin.from('agencies').select('stripe_customer_id').eq('id', session.agencyId).single();
  if (!agency || !agency.stripe_customer_id) return res.status(400).json({ error: 'No billing account yet — subscribe first.' });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: agency.stripe_customer_id,
    return_url: `${origin}/admin`
  });

  return res.status(200).json({ url: portalSession.url });
}
