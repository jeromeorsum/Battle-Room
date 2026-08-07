import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { generateAgencyCode } from '../../lib/codes';
import { tierById } from '../../lib/pricing';
import { normalizeEmailForTrialCheck } from '../../lib/emailNormalize';

const TRIAL_DAYS = 14;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { name, adminCode, managerCode, planTier, billingPeriod, contactEmail, contactPhone, referralCode } = req.body;
  if (!name || !adminCode) return res.status(400).json({ error: 'Agency name and admin code are required.' });
  if (String(adminCode).length < 8) return res.status(400).json({ error: 'Admin code must be at least 8 characters — this protects your whole roster.' });
  if (managerCode && String(managerCode).length < 8) return res.status(400).json({ error: 'Manager code must be at least 8 characters too.' });
  if (!contactEmail || !contactPhone) return res.status(400).json({ error: 'Contact email and phone are both required.' });
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(contactEmail)) return res.status(400).json({ error: 'That doesn\u2019t look like a valid email address.' });
  const digitsOnly = contactPhone.replace(/\D/g, '');
  if (digitsOnly.length < 10) return res.status(400).json({ error: 'That doesn\u2019t look like a valid phone number.' });

  // One free trial per (normalized) email — stops the obvious "keep making
  // new accounts to keep getting a free trial" trick.
  const normalizedEmail = normalizeEmailForTrialCheck(contactEmail);
  const { data: alreadyTrialed } = await supabaseAdmin.from('trial_signups').select('normalized_email').eq('normalized_email', normalizedEmail).single();
  if (alreadyTrialed) {
    return res.status(403).json({ error: 'This email has already used a free trial. If you believe this is an error, contact support.' });
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
      referred_by_code
    })
    .select('id, name, agency_code, plan_tier, billing_period, status, max_creators, trial_ends_at, referral_code')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabaseAdmin.from('trial_signups').insert({ normalized_email: normalizedEmail });

  return res.status(201).json(data);
}
