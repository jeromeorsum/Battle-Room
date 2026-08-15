import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { setSessionCookie, COOKIES } from '../../lib/session';
import { checkLock, recordFailure, recordSuccess } from '../../lib/rateLimit';
import { isLockedOut } from '../../lib/agencyStatus';
import { resolveAgencyId } from '../../lib/agencyScope';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { creatorId, identifier: loginIdentifier, pin } = req.body;
  if ((!creatorId && !loginIdentifier) || !pin) return res.status(400).json({ error: 'Enter your handle/nickname and PIN.' });

  let creator;

  if (creatorId) {
    // Legacy path: log in by a known creatorId (still used by any old cached client code).
    const rateKey = `creator:${creatorId}`;
    const lock = await checkLock(rateKey);
    if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });
    const { data, error } = await supabaseAdmin.from('creators').select('id, name, agency_id, pin_hash').eq('id', creatorId).single();
    if (error || !data) { await recordFailure(rateKey); return res.status(404).json({ error: 'Profile not found.' }); }
    const ok = await bcrypt.compare(String(pin), data.pin_hash);
    if (!ok) { await recordFailure(rateKey); return res.status(401).json({ error: 'Incorrect PIN.' }); }
    await recordSuccess(rateKey);
    creator = data;
  } else {
    // Normal path: sign in by typing your handle or nickname, scoped to
    // whichever agency this browser currently has resolved.
    const agencyId = await resolveAgencyId(req);
    if (!agencyId) return res.status(401).json({ error: 'Enter your agency code first.' });

    const clean = loginIdentifier.trim().replace(/^@+/, '');
    const rateKey = `login:${agencyId}:${clean.toLowerCase()}`;
    const lock = await checkLock(rateKey);
    if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

    // PostgREST's .or() filter syntax uses commas to separate conditions
    // and treats spaces/commas/parentheses as structurally significant, so
    // a value like "Agency C Creator" silently breaks the filter unless
    // it's wrapped in double quotes — with any existing backslash or quote
    // in the value itself escaped first so it can't break out of that
    // quoting. Wildcard characters are escaped too, so a literal % or _ in
    // someone's real nickname doesn't act as an ilike wildcard.
    const escapeForOrFilter = (value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[%_]/g, '\\$&')}"`;
    const safeClean = escapeForOrFilter(clean);

    const { data: matches } = await supabaseAdmin
      .from('creators').select('id, name, agency_id, pin_hash')
      .eq('agency_id', agencyId)
      .or(`name.ilike.${safeClean},handle.ilike.${safeClean}`);

    if (!matches || matches.length === 0) { await recordFailure(rateKey); return res.status(404).json({ error: 'No profile found with that handle/nickname.' }); }

    // If the same nickname/handle happens to match more than one profile,
    // try each against the PIN rather than guessing which one they meant.
    let found = null;
    for (const m of matches) {
      if (await bcrypt.compare(String(pin), m.pin_hash)) { found = m; break; }
    }
    if (!found) { await recordFailure(rateKey); return res.status(401).json({ error: 'Incorrect PIN.' }); }
    await recordSuccess(rateKey);
    creator = found;
  }

  const { data: agency } = await supabaseAdmin.from('agencies').select('status').eq('id', creator.agency_id).single();
  if (isLockedOut(agency?.status)) {
    return res.status(402).json({ error: 'This agency\u2019s account is inactive. Contact your agency admin.' });
  }

  setSessionCookie(res, COOKIES.CREATOR, { creatorId: creator.id, agencyId: creator.agency_id }, 60 * 60 * 24 * 30);
  await supabaseAdmin.from('creators').update({ last_active_at: new Date().toISOString() }).eq('id', creator.id);
  return res.status(200).json({ id: creator.id, name: creator.name });
}
