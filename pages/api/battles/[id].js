import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { notifyCreator } from '../../../lib/push';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  const { id } = req.query;
  const creatorSession = readSession(req, COOKIES.CREATOR);
  const adminSession = readSession(req, COOKIES.ADMIN);

  const { data: battle, error: fetchErr } = await supabaseAdmin.from('battles').select('*').eq('id', id).single();
  if (fetchErr || !battle) return res.status(404).json({ error: 'Battle not found.' });

  const isParticipant = creatorSession && (creatorSession.creatorId === battle.creator_a || creatorSession.creatorId === battle.creator_b);
  const isAgencyAdmin = adminSession && adminSession.agencyId === battle.agency_id;

  if (req.method === 'PATCH') {
    // Accept/decline can only be done by the actual participant, proven via
    // their session — not by whoever the client claims "actorId" to be.
    if (!isParticipant) return res.status(403).json({ error: 'Only a participant can respond to this battle.' });
    const actorId = creatorSession.creatorId;
    const { action } = req.body;

    const update = {};
    if (action === 'accept') {
      if (actorId === battle.creator_a) update.accepted_a = true;
      if (actorId === battle.creator_b) update.accepted_b = true;
      update.declined = false;
    } else if (action === 'decline') {
      update.declined = true;
    } else {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('battles').update(update).eq('id', id).select('*').single();
    if (error) return res.status(500).json({ error: error.message });

    const other = actorId === battle.creator_a ? battle.creator_b : battle.creator_a;
    const { data: actor } = await supabaseAdmin.from('creators').select('name').eq('id', actorId).single();

    if (action === 'accept' && updated.accepted_a && updated.accepted_b) {
      await notifyCreator(other, { title: 'Battle confirmed 🏆', body: `${actor ? actor.name : 'Your opponent'} accepted — it's on the calendar.`, url: '/app' });
    } else if (action === 'decline') {
      await notifyCreator(other, { title: 'Battle declined', body: `${actor ? actor.name : 'The other creator'} declined this matchup.`, url: '/app' });
    }

    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    if (!isParticipant && !isAgencyAdmin) return res.status(403).json({ error: 'Not authorized to remove this battle.' });
    const { error } = await supabaseAdmin.from('battles').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end();
}
