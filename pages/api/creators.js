import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, setSessionCookie, COOKIES } from '../../lib/session';
import { canWrite } from '../../lib/agencyStatus';
import { resolveAgencyId } from '../../lib/agencyScope';
import { logAudit } from '../../lib/auditLog';

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
    const { name, handle, diamonds, league, tz, tags, pin, gender, agencyCode, ageAttested } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Name and PIN are required.' });
    if (String(pin).length < 6) return res.status(400).json({ error: 'PIN must be at least 6 characters.' });
    if (!ageAttested) return res.status(400).json({ error: 'You must confirm you are 18 or older to create an account on this platform.' });

    // Creating an account is the one action where we deliberately don't
    // trust any cookie — we re-verify the actual agency code against the
    // database fresh, every time. This is what determines which agency's
    // roster (and LFG board) a new creator ends up in, so it can't be
    // allowed to drift from a stale cookie.
    let agencyId;
    if (agencyCode) {
      const { data: agencyByCode } = await supabaseAdmin.from('agencies').select('id').eq('agency_code', agencyCode.trim().toUpperCase()).single();
      if (!agencyByCode) return res.status(404).json({ error: 'That agency code is no longer valid — please re-enter it.' });
      agencyId = agencyByCode.id;
    } else {
      agencyId = await requireAgencyScope(req, res);
      if (!agencyId) return;
    }

    const { data: agency, error: agencyErr } = await supabaseAdmin
      .from('agencies').select('id, max_creators, status, trial_ends_at').eq('id', agencyId).single();
    if (agencyErr || !agency) return res.status(404).json({ error: 'Agency not found.' });
    if (!canWrite(agency.status, agency.trial_ends_at)) return res.status(402).json({ error: 'This agency\u2019s subscription is inactive. Contact your agency admin.' });

    const { count } = await supabaseAdmin.from('creators').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId);
    if ((count || 0) >= agency.max_creators) {
      return res.status(403).json({ error: "This agency has reached its plan's creator limit." });
    }

    const cleanHandle = handle ? handle.trim().replace(/^@+/, '') : null;
    const adminSession = readSession(req, COOKIES.ADMIN);

    if (cleanHandle) {
      const normalized_handle = cleanHandle.toLowerCase();
      const { data: blocked } = await supabaseAdmin
        .from('removed_creators').select('normalized_handle').eq('agency_id', agencyId).eq('normalized_handle', normalized_handle).single();
      if (blocked) {
        if (adminSession && adminSession.agencyId === agencyId && adminSession.role === 'admin') {
          // An admin explicitly re-adding this handle is the intended way
          // to lift the block — clear it and let this go through.
          await supabaseAdmin.from('removed_creators').delete().eq('agency_id', agencyId).eq('normalized_handle', normalized_handle);
        } else {
          return res.status(403).json({ error: 'This TikTok handle was removed from this agency. Ask your agency admin to re-add you.' });
        }
      }
    }

    const pin_hash = await bcrypt.hash(String(pin), 12);
    const { data, error } = await supabaseAdmin
      .from('creators')
      .insert({
        agency_id: agencyId, name, handle: cleanHandle,
        diamonds: diamonds || 0, league: league || null, tz: tz || 'ET',
        tags: tags || [], gender: gender || null, pin_hash,
        age_attested: true, age_attested_at: new Date().toISOString()
      })
      .select('id, name, handle, diamonds, league, tz, tags, avatar_url, gender')
      .single();
    if (error) return res.status(500).json({ error: error.message });

    // Creating a profile logs you in immediately, same as before.
    setSessionCookie(res, COOKIES.CREATOR, { creatorId: data.id, agencyId }, 60 * 60 * 24 * 30);
    if (readSession(req, COOKIES.ADMIN)) await logAudit(agencyId, 'Agency admin', 'Added creator', data.name);
    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
