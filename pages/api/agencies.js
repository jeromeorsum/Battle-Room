import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { generateAgencyCode } from '../../lib/codes';
import { tierById } from '../../lib/pricing';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { name, adminCode, planTier, billingPeriod, contactEmail, contactPhone } = req.body;
  if (!name || !adminCode) return res.status(400).json({ error: 'Agency name and admin code are required.' });
  if (String(adminCode).length < 8) return res.status(400).json({ error: 'Admin code must be at least 8 characters — this protects your whole roster.' });

  const tier = tierById(planTier || 'starter');
  const admin_code_hash = await bcrypt.hash(String(adminCode), 12);

  // Generate a code and retry on the rare collision instead of trusting one draw.
  let agency_code = generateAgencyCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabaseAdmin.from('agencies').select('id').eq('agency_code', agency_code).single();
    if (!clash) break;
    agency_code = generateAgencyCode();
  }

  const { data, error } = await supabaseAdmin
    .from('agencies')
    .insert({
      name,
      agency_code,
      admin_code_hash,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      plan_tier: tier.id,
      billing_period: billingPeriod === 'yearly' ? 'yearly' : 'monthly',
      status: 'trialing',
      max_creators: tier.maxCreators || 100000
    })
    .select('id, name, agency_code, plan_tier, billing_period, status, max_creators')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
}
