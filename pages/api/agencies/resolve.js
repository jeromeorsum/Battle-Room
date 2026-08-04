import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { setSessionCookie, COOKIES } from '../../../lib/session';
import { checkLock, recordFailure, recordSuccess } from '../../../lib/rateLimit';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { agencyCode } = req.body;
  if (!agencyCode) return res.status(400).json({ error: 'Missing agency code.' });
  const normalized = agencyCode.trim().toUpperCase();
  const identifier = `resolve:${normalized}`;

  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  const { data, error } = await supabaseAdmin
    .from('agencies')
    .select('id, name, status, plan_tier, max_creators')
    .eq('agency_code', normalized)
    .single();

  if (error || !data) {
    await recordFailure(identifier);
    return res.status(404).json({ error: 'No agency found with that code.' });
  }

  await recordSuccess(identifier);
  // Proves "I know this agency's code" for subsequent roster reads —
  // without this cookie, GET /api/creators and GET /api/battles refuse to
  // return anything, even if you know the agency's internal UUID.
  setSessionCookie(res, COOKIES.AGENCY_SCOPE, { agencyId: data.id }, 60 * 60 * 24 * 30);
  return res.status(200).json(data);
}
