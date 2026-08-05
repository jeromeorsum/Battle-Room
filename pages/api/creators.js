import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, setSessionCookie, COOKIES } from '../../lib/session';
import { canWrite } from '../../lib/agencyStatus';
import { resolveAgencyId } from '../../lib/agencyScope';

function requireAgencyScope(req, res) {
  const agencyId = resolveAgencyId(req);
  if (!agencyId) { res.status(401).json({ error: 'Enter your agency code first.' }); return null; }
  return agencyId;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const agencyId = requireAgencyScope(req, res);
    if (!agencyId) return;
    const { data, error } = await supabaseAdmin
      .from('creators')
      .select('id, name, handle, diamonds, league, tz, tags, avatar_url, gender, created_at')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const agencyId = requireAgencyScope(req, res);
    if (!agencyId) return;
    const { name, handle, diamonds, league, tz, tags, pin, gender } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Name and PIN are required.' });
    if (String(pin).length < 6) return res.status(400).json({ error: 'PIN must be at least 6 characters.' });

    const { data: agency, error: agencyErr } = await supabaseAdmin
      .from('agencies').select('id, max_creators, status').eq('id', agencyId).single();
    if (agencyErr || !agency) return res.status(404).json({ error: 'Agency not found.' });
    if (!canWrite(agency.status)) return res.status(402).json({ error: 'This agency\u2019s subscription is inactive. Contact your agency admin.' });

    const { count } = await supabaseAdmin.from('creators').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId);
    if ((count || 0) >= agency.max_creators) {
      return res.status(403).json({ error: "This agency has reached its plan's creator limit." });
    }

    const cleanHandle = handle ? handle.trim().replace(/^@+/, '') : null;
    const pin_hash = await bcrypt.hash(String(pin), 12);
    const { data, error } = await supabaseAdmin
      .from('creators')
      .insert({
        agency_id: agencyId, name, handle: cleanHandle,
        diamonds: diamonds || 0, league: league || null, tz: tz || 'ET',
        tags: tags || [], gender: gender || null, pin_hash
      })
      .select('id, name, handle, diamonds, league, tz, tags, avatar_url, gender')
      .single();
    if (error) return res.status(500).json({ error: error.message });

    // Creating a profile logs you in immediately, same as before.
    setSessionCookie(res, COOKIES.CREATOR, { creatorId: data.id, agencyId }, 60 * 60 * 24 * 30);
    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
