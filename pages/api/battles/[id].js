import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { notifyCreator } from '../../../lib/push';
import { readSession, COOKIES } from '../../../lib/session';
import { canWrite } from '../../../lib/agencyStatus';
import { zoneByCode, zonedTimeToUtc } from '../../../lib/constants';

export default async function handler(req, res) {
  const { id } = req.query;
  const creatorSession = readSession(req, COOKIES.CREATOR);
  const adminSession = readSession(req, COOKIES.ADMIN);

  const { data: battle, error: fetchErr } = await supabaseAdmin.from('battles').select('*').eq('id', id).single();
  if (fetchErr || !battle) return res.status(404).json({ error: 'Battle not found.' });

  const isParticipant = creatorSession && (creatorSession.creatorId === battle.creator_a || creatorSession.creatorId === battle.creator_b);
  const isAgencyAdmin = adminSession && adminSession.agencyId === battle.agency_id;

  if (req.method === 'PATCH') {
    // Accept/decline/counter can only be done by the actual participant,
    // proven via their session — not by whoever the client claims "actorId" to be.
    if (!isParticipant) return res.status(403).json({ error: 'Only a participant can respond to this battle.' });

    const { data: agency } = await supabaseAdmin.from('agencies').select('status, trial_ends_at').eq('id', battle.agency_id).single();
    if (!canWrite(agency?.status, agency?.trial_ends_at)) return res.status(402).json({ error: 'This agency\u2019s subscription is inactive. Contact your agency admin.' });

    const actorId = creatorSession.creatorId;
    const { action } = req.body;

    if (action === 'counter') {
      // Declines the original invite and creates a fresh one at the time
      // the countering party actually can do — same two people, new time,
      // with the counterer auto-accepted (they're the one proposing this
      // time) and the original proposer needing to respond to it.
      const { localDateTime, zoneCode, notes } = req.body;
      if (!localDateTime) return res.status(400).json({ error: 'Pick a new time to propose.' });

      const zone = zoneByCode(zoneCode);
      const utcDate = zonedTimeToUtc(localDateTime, zone.iana);
      if (utcDate.getTime() < Date.now() - 5 * 60 * 1000) {
        return res.status(400).json({ error: 'Pick a time in the future — you can\u2019t propose a battle in the past.' });
      }

      await supabaseAdmin.from('battles').update({ declined: true }).eq('id', id);

      const acceptedA = actorId === battle.creator_a;
      const acceptedB = actorId === battle.creator_b;

      const { data: newBattle, error } = await supabaseAdmin
        .from('battles')
        .insert({
          agency_id: battle.agency_id, creator_a: battle.creator_a, creator_b: battle.creator_b,
          datetime_utc: utcDate.toISOString(), zone_code: zone.code,
          notes: notes || null, accepted_a: acceptedA, accepted_b: acceptedB,
          declined: false, created_by: actorId
        })
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });

      const other = actorId === battle.creator_a ? battle.creator_b : battle.creator_a;
      const { data: actor } = await supabaseAdmin.from('creators').select('name').eq('id', actorId).single();
      await notifyCreator(other, {
        title: 'New time proposed',
        body: `${actor ? actor.name : 'Someone'} couldn't make the original time and proposed a new one. Open Battle Room to respond.`,
        url: '/app'
      });

      return res.status(201).json(newBattle);
    }

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

    // Notify the other side(s) that the battle is off — but only if it wasn't
    // already dead (declined) and hadn't already happened. If a creator
    // cancels, tell their opponent; if an admin cancels, tell both creators.
    const alreadyDead = battle.declined;
    const inPast = new Date(battle.datetime_utc).getTime() < Date.now();
    if (!alreadyDead && !inPast) {
      let recipients = [];
      let actorName = 'Your opponent';
      if (isParticipant) {
        const actorId = creatorSession.creatorId;
        recipients = [actorId === battle.creator_a ? battle.creator_b : battle.creator_a];
        const { data: actor } = await supabaseAdmin.from('creators').select('name').eq('id', actorId).single();
        if (actor) actorName = actor.name;
      } else {
        recipients = [battle.creator_a, battle.creator_b];
        actorName = 'Your agency';
      }
      await Promise.all(recipients.filter(Boolean).map((rid) => notifyCreator(rid, {
        title: 'Battle cancelled',
        body: `${actorName} cancelled a scheduled battle. Open Battle Room for details.`,
        url: '/app'
      })));
    }

    const { error } = await supabaseAdmin.from('battles').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end();
}
