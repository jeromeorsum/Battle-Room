import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

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
  const isAgencyAdmin = adminSession && adminSession.agencyId === creator.agency_id;
  if (!isSelf && !isAgencyAdmin) return res.status(403).json({ error: 'Not authorized to modify this profile.' });

  if (req.method === 'PUT') {
    const { name, handle, email, diamonds, league, tz, tags, pin } = req.body;
    const update = {
      name, handle: handle || null, email: email || null,
      diamonds: diamonds || 0, league: league || null, tz: tz || 'ET', tags: tags || []
    };
    if (pin) {
      if (String(pin).length < 6) return res.status(400).json({ error: 'PIN must be at least 6 characters.' });
      update.pin_hash = await bcrypt.hash(String(pin), 12);
    }

    const { data, error } = await supabaseAdmin
      .from('creators')
      .update(update)
      .eq('id', id)
      .select('id, name, handle, email, diamonds, league, tz, tags')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin.from('creators').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end();
}
