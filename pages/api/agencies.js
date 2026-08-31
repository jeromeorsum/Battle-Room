import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { generateAgencyCode } from '../../lib/codes';
import { tierById } from '../../lib/pricing';
import { normalizeEmailForTrialCheck } from '../../lib/emailNormalize';
import { isAdultDOB } from '../../lib/age';
import { stripe } from '../../lib/stripeAdmin';
import { priceIdFor } from '../../lib/priceMap';
import { TRIAL_DAYS as TRIAL_PERIOD_DAYS } from '../../lib/trialTerms';
import { createAuthToken } from '../../lib/authTokens';
import { sendEmail } from '../../lib/emailAdmin';
import { logError } from '../../lib/logger';

const TRIAL_DAYS = 14;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { name, adminCode, managerCode, planTier, billingPeriod, contactEmail, contactPhone, referralCode, ageAttested, dateOfBirth, billingConsent, turnstileToken } = req.body;
  if (!name || !adminCode) return res.status(400).json({ error: 'Agency name and admin code are required.' });
  if (!ageAttested) return res.status(400).json({ error: 'You must confirm you are 18 or older to create an agency on this platform.' });
  if (!dateOfBirth) return res.status(400).json({ error: 'Please enter your date of birth.' });
  if (!isAdultDOB(dateOfBirth)) return res.status(400).json({ error: 'You must be at least 18 years old to use this platform. Please enter a valid date of birth.' });

  // Bot protection — only enforced once TURNSTILE_SECRET_KEY is configured.
  // This deliberately FAILS OPEN: if we have a token we ask Cloudflare to
  // verify it and reject only when Cloudflare positively says it's invalid
  // (a real bot signal). If the widget couldn't load, no token was sent, or
  // Cloudflare's siteverify endpoint is unreachable/erroring, we let the
  // signup through rather than block real people during a Cloudflare outage.
  // The trade-off: during an outage we get no bot filtering, but signups are
  // never held hostage to a third party's downtime, and protection resumes
  // automatically the moment Cloudflare recovers.
  if (process.env.TURNSTILE_SECRET_KEY && turnstileToken) {
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: turnstileToken })
      });
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        // Only block on an explicit failure verdict from Cloudflare. Any
        // other outcome (network error, non-200, malformed response) falls
        // through to allow, so an outage can't lock out real users.
        if (verifyData && verifyData.success === false) {
          return res.status(400).json({ error: 'Verification check failed — please try again.' });
        }
      }
    } catch (err) {
      // Cloudflare unreachable — fail open, allow the signup.
    }
  }
  if (String(adminCode).length < 8) return res.status(400).json({ error: 'Admin code must be at least 8 characters — this protects your whole roster.' });
  if (managerCode && String(managerCode).length < 8) return res.status(400).json({ error: 'Manager code must be at least 8 characters too.' });
  if (managerCode && String(managerCode) === String(adminCode)) return res.status(400).json({ error: 'Your manager code must be different from your admin code — otherwise managers would get full admin access.' });
  if (!contactEmail || !contactPhone) return res.status(400).json({ error: 'Contact email and phone are both required.' });
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(contactEmail)) return res.status(400).json({ error: 'That doesn\u2019t look like a valid email address.' });
  const digitsOnly = contactPhone.replace(/\D/g, '');
  if (digitsOnly.length < 10) return res.status(400).json({ error: 'That doesn\u2019t look like a valid phone number.' });

  // One free trial per (normalized) email or phone number — using two
  // independent signals is meaningfully harder to game than either alone,
  // since making up a plausible-looking phone number on top of a fresh
  // email is more friction than most trial-farming attempts bother with.
  const normalizedEmail = normalizeEmailForTrialCheck(contactEmail);
  const normalizedPhone = digitsOnly;
  const [{ data: emailUsed }, { data: phoneUsed }] = await Promise.all([
    supabaseAdmin.from('trial_signups').select('normalized_email').eq('normalized_email', normalizedEmail).single(),
    supabaseAdmin.from('trial_signups_phone').select('normalized_phone').eq('normalized_phone', normalizedPhone).single()
  ]);
  if (emailUsed || phoneUsed) {
    return res.status(403).json({ error: 'This email or phone number has already used a free trial. If you believe this is an error, contact support.' });
  }

  const tier = tierById(planTier || 'starter');
  const admin_code_hash = await bcrypt.hash(String(adminCode), 12);
  const manager_code_hash = managerCode ? await bcrypt.hash(String(managerCode), 12) : null;

  // Generate codes and retry on the rare collision instead of trusting one draw.
  let agency_code = generateAgencyCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabaseAdmin.from('agencies').select('id').eq('agency_code', agency_code).single();
    if (!clash) break;
    agency_code = generateAgencyCode();
  }
  let referral_code = generateAgencyCode(6);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabaseAdmin.from('agencies').select('id').eq('referral_code', referral_code).single();
    if (!clash) break;
    referral_code = generateAgencyCode(6);
  }

  // Validate the referral code if one was entered, but don't hard-fail
  // signup over a typo'd code — just don't attach the credit.
  let referred_by_code = null;
  if (referralCode) {
    const { data: referrer } = await supabaseAdmin.from('agencies').select('id').eq('referral_code', referralCode.trim().toUpperCase()).single();
    if (referrer) referred_by_code = referralCode.trim().toUpperCase();
  }

  const trial_ends_at = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const signup_ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;

  const { data, error } = await supabaseAdmin
    .from('agencies')
    .insert({
      name,
      agency_code,
      admin_code_hash,
      manager_code_hash,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      plan_tier: tier.id,
      billing_period: billingPeriod === 'yearly' ? 'yearly' : 'monthly',
      status: 'trialing',
      max_creators: tier.maxCreators || 100000,
      trial_ends_at,
      referral_code,
      referred_by_code,
      signup_ip,
      age_attested: true,
      age_attested_at: new Date().toISOString(),
      date_of_birth: dateOfBirth
    })
    .select('id, name, agency_code, plan_tier, billing_period, status, max_creators, trial_ends_at, referral_code')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabaseAdmin.from('trial_signups').insert({ normalized_email: normalizedEmail });
  await supabaseAdmin.from('trial_signups_phone').insert({ normalized_phone: normalizedPhone });

  // Card-upfront free trial (auto-converts to paid). Only active once Stripe
  // monthly pricing is configured — until then, signup keeps working as a
  // no-card trial so nothing breaks pre-launch. When configured, we create a
  // Stripe Checkout that requires a card, starts a 14-day trial, and lets
  // Stripe charge automatically when the trial ends.
  //
  // The trial ALWAYS converts to the MONTHLY plan, never annual — annual
  // (12+ month) auto-renewals are "extended" renewals under Idaho Code
  // § 48-603G and carry a heavier 30–60-day pre-renewal reminder duty. Users
  // can switch to annual later from billing. Keeping the trial monthly keeps
  // us in the lighter-touch compliance lane.
  let checkoutUrl = null;
  const cardTrialOn = process.env.NEXT_PUBLIC_CARD_TRIAL === '1';
  const monthlyPriceId = priceIdFor(tier.id, 'monthly');
  if (cardTrialOn && monthlyPriceId) {
    // Affirmative consent is legally required before we set up recurring
    // billing — the frontend requires the consent checkbox, and we re-check
    // it here so a request can't skip it.
    if (!billingConsent) return res.status(400).json({ error: 'Please authorize the subscription charge to start your free trial.' });
    try {
      const customer = await stripe.customers.create({
        email: contactEmail || undefined,
        name,
        metadata: { agencyId: data.id }
      });
      await supabaseAdmin.from('agencies').update({ stripe_customer_id: customer.id }).eq('id', data.id);
      const origin = req.headers.origin || `https://${req.headers.host}`;
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customer.id,
        payment_method_collection: 'always', // require a card even during the trial
        line_items: [{ price: monthlyPriceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: TRIAL_PERIOD_DAYS,
          // If they never leave a usable card, cancel at trial end rather than
          // silently failing to charge.
          trial_settings: { end_behavior: { missing_payment_method: 'cancel' } }
        },
        success_url: `${origin}/admin?checkout=success`,
        cancel_url: `${origin}/signup?checkout=cancel`,
        metadata: { agencyId: data.id, planTier: tier.id, billingPeriod: 'monthly' }
      });
      checkoutUrl = checkoutSession.url;
    } catch (err) {
      await logError('signup-trial-checkout', err);
      // Fall through — the agency still exists on a no-card trial if the
      // checkout couldn't be created, so signup never hard-fails on Stripe.
    }
  }

  // Verify the contact email is real and reachable — it's what receives
  // billing codes, password resets, and invites, so an unverified/typo'd
  // address quietly breaks account recovery down the line. This doesn't
  // block signup or the trial itself, just flags the address as confirmed.
  try {
    const token = await createAuthToken({ type: 'email_verify', agencyId: data.id, email: contactEmail });
    const origin = req.headers.origin || `https://${req.headers.host}`;
    await sendEmail({
      to: contactEmail,
      subject: `Confirm your email for ${data.name}`,
      html: `<p>Welcome to Battle Room Clash! Please confirm this is your real contact email — it's what you'll use for billing codes, password resets, and invites.</p>
             <p><a href="${origin}/verify-email?token=${token}">Confirm my email</a></p>
             <p>This link expires in 48 hours. If you didn't sign up for Battle Room Clash, you can ignore this.</p>`
    });
  } catch (err) {
    await logError('agencies:verification-email', err);
  }

  return res.status(201).json({ ...data, checkoutUrl });
}
