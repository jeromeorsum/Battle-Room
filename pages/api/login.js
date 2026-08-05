import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { setSessionCookie, COOKIES } from '../../lib/session';
import { checkLock, recordFailure, recordSuccess } from '../../lib/rateLimit';
import { isLockedOut } from '../../lib/agencyStatus';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { creatorId, pin } = req.body;
  if (!creatorId || !pin) return res.status(400).json({ error: 'Missing creatorId or pin.' });

  const identifier = `creator:${creatorId}`;
  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  const { data: creator, error } = await supabaseAdmin
    .from('creators')
    .select('id, name, agency_id, pin_hash')
    .eq('id', creatorId)
    .single();
  if (error || !creator) { await recordFailure(identifier); return res.status(404).json({ error: 'Profile not found.' }); }

  const ok = await bcrypt.compare(String(pin), creator.pin_hash);
  if (!ok) { await recordFailure(identifier); return res.status(401).json({ error: 'Incorrect PIN.' }); }

  const { data: agency } = await supabaseAdmin.from('agencies').select('status').eq('id', creator.agency_id).single();
  if (isLockedOut(agency?.status)) {
    return res.status(402).json({ error: 'This agency\u2019s account is inactive. Contact your agency admin.' });
  }

  await recordSuccess(identifier);
  // This cookie is what every future request trusts to know "who is this
  // creator" — the client can no longer just claim to be any creatorId.
  setSessionCookie(res, COOKIES.CREATOR, { creatorId: creator.id, agencyId: creator.agency_id }, 60 * 60 * 24 * 30);
  return res.status(200).json({ id: creator.id, name: creator.name });
}
