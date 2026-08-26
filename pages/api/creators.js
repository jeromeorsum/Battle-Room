import bcrypt from 'bcryptjs';
import { isAdultDOB } from '../../lib/age';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, setSessionCookie, COOKIES } from '../../lib/session';
import { canWrite } from '../../lib/agencyStatus';
import { resolveAgencyId } from '../../lib/agencyScope';
import { logAudit } from '../../lib/auditLog';
import { checkAndRecordActionRate } from '../../lib/rateLimit';

async function requireAgencyScope(req, res) {
  const agencyId = await resolveAgencyId(req, req.headers['x-session-role']);
  if (!agencyId) { res.status(401).json({ error: 'Enter your agency code first.' }); return null; }
  return agencyId;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const agencyId = await requireAgencyScope(req, res);
    if (!agencyId) return;
    const { data, error } = await supabaseAdmin
      .from('creators')
      .select('id, name, handle, diamonds, league, tz, tags, avatar_url, gender, last_active_at, created_at')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { name, handle, diamonds, league, tz, tags, pin, gender, agencyCode, ageAttested, dateOfBirth } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Name and PIN are required.' });
    if (String(name).trim().length > 60) return res.status(400).json({ error: 'Name is too long (max 60 characters).' });
    if (handle && String(handle).trim().length > 50) return res.status(400).json({ error: 'Handle is too long (max 50 characters).' });
    if (String(pin).length < 6) return res.status(400).json({ error: 'PIN must be at least 6 characters.' });
    if (!ageAttested) return res.status(400).json({ error: 'You must confirm you are 18 or older to create an account on this platform.' });
    // A creator signing themselves up (they entered an agency code) verifies
    // their own age with a date of birth, the same as agency signup. Profiles
    // created by an agency admin instead rely on the agency's attestation
    // (the agency is contractually responsible for its roster being adults).
    if (agencyCode) {
      if (!dateOfBirth) return res.status(400).json({ error: 'Please enter your date of birth.' });
      if (!isAdultDOB(dateOfBirth)) return res.status(400).json({ error: 'You must be at least 18 years old to use this platform. Please enter a valid date of birth.' });
    }

    // Creating an account is the one action where we deliberately don't
    // trust any cookie — we re-verify the actual agency code against the
    // database fresh, every time. This is what determines which agency's
    // roster (and LFG board) a new creator ends up in, so it can't be
    // allowed to drift from a stale cookie.
    let agencyId;
    let pendingInviteId = null; // set when joining via a single-use invite; burned just before insert
    if (agencyCode) {
      const code = agencyCode.trim().toUpperCase();
      // Try a single-use invite first.
      const { data: invite } = await supabaseAdmin
        .from('creator_invites').select('id, agency_id, status, expires_at').ilike('code', code).maybeSingle();
      if (invite) {
        if (invite.status !== 'pending') return res.status(400).json({ error: 'That invite code has already been used or was cancelled. Ask your agency for a new one.' });
        if (new Date(invite.expires_at).getTime() < Date.now()) return res.status(400).json({ error: 'That invite code has expired — invites last 24 hours. Ask your agency for a new one.' });
        agencyId = invite.agency_id;
        pendingInviteId = invite.id;
      } else {
        // Fall back to the shared agency code — only if this agency allows it.
        const { data: agencyByCode } = await supabaseAdmin.from('agencies').select('id, allow_shared_code').eq('agency_code', code).single();
        if (!agencyByCode) return res.status(404).json({ error: 'That code is not valid — please re-enter it.' });
        if (!agencyByCode.allow_shared_code) return res.status(403).json({ error: 'This agency uses invite codes to join. Ask your agency admin to send you an invite link.' });
        agencyId = agencyByCode.id;
      }
    } else {
      agencyId = await requireAgencyScope(req, res);
      if (!agencyId) return;
    }

    const { data: agency, error: agencyErr } = await supabaseAdmin
      .from('agencies').select('id, max_creators, status, trial_ends_at').eq('id', agencyId).single();
    if (agencyErr || !agency) return res.status(404).json({ error: 'Agency not found.' });
    if (!canWrite(agency.status, agency.trial_ends_at)) return res.status(402).json({ error: 'This agency\u2019s subscription is inactive. Contact your agency admin.' });

    // 20 creators added per 10 minutes per agency — the plan's max_creators
    // cap bounds total volume, but does nothing to stop a scripted loop
    // from burning through that limit in under a second.
    const rate = await checkAndRecordActionRate(`creator-add:${agencyId}`, 10, 20);
    if (!rate.allowed) return res.status(429).json({ error: `Adding creators too fast — try again in ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s).` });

    const { count } = await supabaseAdmin.from('creators').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId);
    if ((count || 0) >= agency.max_creators) {
      return res.status(403).json({ error: "This agency has reached its plan's creator limit." });
    }

    const cleanHandle = handle ? handle.trim().replace(/^@+/, '') : null;
    const adminSession = readSession(req, COOKIES.ADMIN);

    if (cleanHandle) {
      const normalized_handle = cleanHandle.toLowerCase();
      // One active profile per handle, per agency. Stops a creator from
      // spinning up multiple accounts under the same handle (and makes the
      // removed-handle block below actually meaningful).
      const { data: existingHandle } = await supabaseAdmin
        .from('creators').select('id').eq('agency_id', agencyId).ilike('handle', cleanHandle).limit(1);
      if (existingHandle && existingHandle.length > 0) {
        return res.status(409).json({ error: 'A creator with that handle already exists in this agency. Handles must be unique.' });
      }

      const { data: blocked } = await supabaseAdmin
        .from('removed_creators').select('normalized_handle').eq('agency_id', agencyId).eq('normalized_handle', normalized_handle).single();
      if (blocked) {
        if (adminSession && adminSession.agencyId === agencyId && adminSession.role === 'admin') {
          // An admin explicitly re-adding this handle is the intended way
          // to lift the block — clear it and let this go through.
          await supabaseAdmin.from('removed_creators').delete().eq('agency_id', agencyId).eq('normalized_handle', normalized_handle);
        } else {
          return res.status(403).json({ error: 'This handle was removed from this agency. Ask your agency admin to re-add you.' });
        }
      }
    }

    const pin_hash = await bcrypt.hash(String(pin), 12);

    // Claim the single-use invite atomically, immediately before creating the
    // account, so two simultaneous signups can never redeem the same code.
    if (pendingInviteId) {
      const { data: claimed } = await supabaseAdmin
        .from('creator_invites')
        .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
        .eq('id', pendingInviteId).eq('status', 'pending')
        .select('id');
      if (!claimed || claimed.length === 0) {
        return res.status(409).json({ error: 'That invite code was just used. Ask your agency for a new one.' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('creators')
      .insert({
        agency_id: agencyId, name, handle: cleanHandle,
        diamonds: diamonds || 0, league: league ? String(league).slice(0, 40) : null, tz: tz ? String(tz).slice(0, 40) : 'ET',
        tags: Array.isArray(tags) ? tags.slice(0, 20) : [], gender: gender ? String(gender).slice(0, 40) : null, pin_hash,
        age_attested: true, age_attested_at: new Date().toISOString(), date_of_birth: dateOfBirth || null,
        age_self_confirmed: !!agencyCode
      })
      .select('id, name, handle, diamonds, league, tz, tags, avatar_url, gender')
      .single();
    if (error) {
      // Account creation failed after we claimed the invite — release it so it
      // isn't wasted.
      if (pendingInviteId) await supabaseAdmin.from('creator_invites').update({ status: 'pending', redeemed_at: null }).eq('id', pendingInviteId);
      return res.status(500).json({ error: error.message });
    }
    // Record who redeemed the invite.
    if (pendingInviteId) await supabaseAdmin.from('creator_invites').update({ redeemed_by: data.id }).eq('id', pendingInviteId);

    // Creating a profile logs you in immediately, same as before.
    setSessionCookie(res, COOKIES.CREATOR, { creatorId: data.id, agencyId }, 60 * 60 * 24 * 30);
    if (readSession(req, COOKIES.ADMIN)) await logAudit(agencyId, 'Agency admin', 'Added creator', data.name);
    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
