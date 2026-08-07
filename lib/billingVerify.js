import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabaseAdmin';

// Checks a billing verification code, marks it used if valid. Returns
// true/false — callers should reject the request if this returns false.
export async function verifyBillingCode(agencyId, code) {
  if (!code) return false;
  const { data: candidates } = await supabaseAdmin
    .from('billing_verifications')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  for (const c of candidates || []) {
    if (await bcrypt.compare(String(code), c.code_hash)) {
      await supabaseAdmin.from('billing_verifications').update({ used: true }).eq('id', c.id);
      return true;
    }
  }
  return false;
}
