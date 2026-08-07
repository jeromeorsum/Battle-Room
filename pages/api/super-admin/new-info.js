import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session || session.role !== 'superadmin') return res.status(401).json({ error: 'Not authorized.' });

  const [{ data: recentAgencies }, { data: recentCreators }] = await Promise.all([
    supabaseAdmin.from('agencies').select('id, name, contact_email, signup_ip, status, created_at').order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('creators').select('id, name, handle, agency_id, created_at').order('created_at', { ascending: false }).limit(30)
  ]);

  // Flag agencies whose signup IP was also used by a different agency —
  // a real (if imperfect) signal for "same person making another account
  // to get another free trial." Shared office/coworking wifi can produce
  // false positives, so this is a flag for a human to review, not an
  // automatic block.
  const ipCounts = {};
  for (const a of recentAgencies || []) {
    if (!a.signup_ip) continue;
    ipCounts[a.signup_ip] = (ipCounts[a.signup_ip] || 0) + 1;
  }
  const agenciesWithFlags = (recentAgencies || []).map((a) => ({
    ...a,
    flagged: a.signup_ip ? ipCounts[a.signup_ip] > 1 : false
  }));

  return res.status(200).json({ agencies: agenciesWithFlags, creators: recentCreators || [] });
}
