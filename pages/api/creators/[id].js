import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, setSessionCookie, COOKIES, pinFingerprint } from '../../../lib/session';
import { logAudit } from '../../../lib/auditLog';

export default async function handler(req, res) {
  const { id } = req.query;

  // Only the creator themself (proven via their session cookie, not a
  // client-claimed id) or an admin of the agency they belong to can
  // edit/delete a profile. This closes a real hole from the earlier
  // version, where anyone who knew a creator's UUID could edit or delete
  // their profile with no PIN check at all.
  const { data: creator, error: fetchErr } = await supabaseAdmin.from('creators').select('id, agency_id').eq('id', id).single();
  if (fetchErr || !creator) return res.status(404).json({ error: 'Profile not found.' });

  const creatorSession = readSession(req, COOKIES.CREATOR);
  const adminSession = readSession(req, COOKIES.ADMIN);
  const isSelf = creatorSession && creatorSession.creatorId === id;
  const isAgencyAdmin = adminSession && adminSession.agencyId === creator.agency_id && adminSession.role === 'admin';
  const isAgencyManager = adminSession && adminSession.agencyId === creator.agency_id && adminSession.role === 'manager';
  if (!isSelf && !isAgencyAdmin && !isAgencyManager) return res.status(403).json({ error: 'Not authorized to modify this profile.' });

  if (req.method === 'PUT') {
    const { name, handle, diamonds, league, tz, tags, pin, currentPin, avatar_url, gender } = req.body;
    const cleanHandle = handle ? handle.trim().replace(/^@+/, '') : null;
    const update = {
      name, handle: cleanHandle,
      diamonds: diamonds || 0, league: league || null, tz: tz || 'ET', tags: tags || []
    };
    if (avatar_url !== undefined) update.avatar_url = avatar_url || null;
    if (gender !== undefined) update.gender = gender || null;

    // Handles are unique per agency — don't let an edit collide with another
    // creator's handle (excluding this creator's own record).
    if (cleanHandle) {
      const { data: clash } = await supabaseAdmin
        .from('creators').select('id').eq('agency_id', creator.agency_id).ilike('handle', cleanHandle).neq('id', id).limit(1);
      if (clash && clash.length > 0) {
        return res.status(409).json({ error: 'Another creator in this agency already uses that handle. Handles must be unique.' });
      }
    }

    if (pin) {
      if (String(pin).length < 6) return res.status(400).json({ error: 'PIN must be at least 6 characters.' });
      // If you're changing your own PIN, you must prove you know the
      // current one first. An admin resetting someone else's PIN skips
      // this — they're already a higher authority. A manager can't reset
      // anyone else's PIN at all.
      if (isSelf) {
        const { data: current } = await supabaseAdmin.from('creators').select('pin_hash').eq('id', id).single();
        const ok = current && await bcrypt.compare(String(currentPin || ''), current.pin_hash);
        if (!ok) return res.status(401).json({ error: 'Current PIN is incorrect.' });
      } else if (!isAgencyAdmin) {
        return res.status(403).json({ error: 'Only an admin can reset someone else\u2019s PIN.' });
      }
      update.pin_hash = await bcrypt.hash(String(pin), 12);
    }

    const { data, error } = await supabaseAdmin
      .from('creators')
      .update(update)
      .eq('id', id)
      .select('id, name, handle, diamonds, league, tz, tags, avatar_url, gender')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (pin && isAgencyAdmin && !isSelf) await logAudit(creator.agency_id, 'Agency admin', 'Reset PIN', data.name);
    // If the creator changed their OWN PIN, re-stamp this device's session
    // with the new fingerprint so they stay logged in here — while every
    // other device they're signed in on is invalidated on its next check.
    // (An admin resetting someone else's PIN deliberately does NOT re-stamp,
    // so all of that creator's sessions get forced out.)
    if (pin && isSelf) {
      setSessionCookie(res, COOKIES.CREATOR, { creatorId: id, agencyId: creator.agency_id, pinFp: pinFingerprint(update.pin_hash) }, 60 * 60 * 24 * 30);
    }
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    if (!isAgencyAdmin) return res.status(403).json({ error: 'Only an admin can remove a creator — managers can\u2019t.' });
    const { data: victim } = await supabaseAdmin.from('creators').select('name, handle').eq('id', id).single();
    const { error } = await supabaseAdmin.from('creators').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    if (victim?.handle) {
      const normalized_handle = victim.handle.trim().toLowerCase().replace(/^@+/, '');
      await supabaseAdmin.from('removed_creators').upsert({ agency_id: creator.agency_id, normalized_handle });
    }
    await logAudit(creator.agency_id, 'Agency admin', 'Removed creator', victim?.name);
    return res.status(204).end();
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end();
}
