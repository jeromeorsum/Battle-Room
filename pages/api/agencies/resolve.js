import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { setSessionCookie, COOKIES } from '../../../lib/session';
import { checkLock, recordFailure, recordSuccess } from '../../../lib/rateLimit';
import { isLockedOut } from '../../../lib/agencyStatus';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { agencyCode } = req.body;
  if (!agencyCode) return res.status(400).json({ error: 'Missing agency code.' });
  const normalized = agencyCode.trim().toUpperCase();
  const identifier = `resolve:${normalized}`;

  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  // The code can be a single-use invite OR the shared agency code. Try the
  // invite first (validated here, but only burned when the profile is created).
  const { data: invite } = await supabaseAdmin
    .from('creator_invites').select('agency_id, status, expires_at').ilike('code', normalized).maybeSingle();

  let data = null;
  if (invite) {
    if (invite.status !== 'pending') { await recordFailure(identifier); return res.status(400).json({ error: 'That invite code has already been used or was cancelled. Ask your agency for a new one.' }); }
    if (new Date(invite.expires_at).getTime() < Date.now()) { await recordFailure(identifier); return res.status(400).json({ error: 'That invite code has expired \u2014 invites last 24 hours. Ask your agency for a new one.' }); }
    const { data: ag } = await supabaseAdmin
      .from('agencies').select('id, name, status, plan_tier, max_creators').eq('id', invite.agency_id).single();
    data = ag;
  } else {
    const { data: ag } = await supabaseAdmin
      .from('agencies').select('id, name, status, plan_tier, max_creators, allow_shared_code').eq('agency_code', normalized).single();
    if (!ag) { await recordFailure(identifier); return res.status(404).json({ error: 'No agency found with that code.' }); }
    if (!ag.allow_shared_code) { await recordFailure(identifier); return res.status(403).json({ error: 'This agency uses invite codes to join. Ask your agency admin to send you an invite link.' }); }
    data = { id: ag.id, name: ag.name, status: ag.status, plan_tier: ag.plan_tier, max_creators: ag.max_creators };
  }

  if (!data) {
    await recordFailure(identifier);
    return res.status(404).json({ error: 'No agency found with that code.' });
  }
  if (isLockedOut(data.status)) {
    return res.status(402).json({ error: 'This agency\u2019s account is inactive. Contact the platform owner.' });
  }

  await recordSuccess(identifier);
  // Proves "I know this agency's code" for subsequent roster reads —
  // without this cookie, GET /api/creators and GET /api/battles refuse to
  // return anything, even if you know the agency's internal UUID.
  setSessionCookie(res, COOKIES.AGENCY_SCOPE, { agencyId: data.id }, 60 * 60 * 24 * 30);
  return res.status(200).json(data);
}
