import { supabaseAdmin } from './supabaseAdmin';

// 'trialing' and 'active' can keep using the app. 'past_due' and 'canceled'
// can still view existing data (so an admin can see what they had), but
// can't create new profiles or book new battles until reactivated.
export async function getAgencyStatus(agencyId) {
  const { data } = await supabaseAdmin.from('agencies').select('status').eq('id', agencyId).single();
  return data ? data.status : null;
}
