import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { zoneByCode, zonedTimeToUtc } from '../../lib/constants';
import { notifyCreator } from '../../lib/push';
import { readSession, COOKIES } from '../../lib/session';
import { canWrite } from '../../lib/agencyStatus';
import { getAgencyStatus } from '../../lib/agencyStatusDb';
import { resolveAgencyId } from '../../lib/agencyScope';
import { checkAndRecordActionRate } from '../../lib/rateLimit';

export default async function handler(req, res) {
  const creatorSession = readSession(req, COOKIES.CREATOR);
  const adminSession = readSession(req, COOKIES.ADMIN);

  if (req.method === 'GET') {
    const agencyId = await resolveAgencyId(req, req.headers['x-session-role']);
    if (!agencyId) return res.status(401).json({ error: 'Enter your agency code first.' });
    const { data, error } = await supabaseAdmin
      .from('battles')
      .select('*')
      .eq('agency_id', agencyId)
      .order('datetime_utc', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    // Who's allowed to book a battle, and as whom, comes from the session —
    // never from the request body. A creator can only propose as themself;
    // an admin can book for any two creators in their own agency.
    let agencyId, proposerId;
    if (creatorSession) { agencyId = creatorSession.agencyId; proposerId = creatorSession.creatorId; }
    else if (adminSession) { agencyId = adminSession.agencyId; proposerId = null; }
    else return res.status(401).json({ error: 'Log in first.' });

    const { creatorA, creatorB, localDateTime, zoneCode, notes } = req.body;
    if (!creatorA || !creatorB || creatorA === creatorB) {
      return res.status(400).json({ error: 'Pick two different creators.' });
    }
    if (creatorSession && creatorSession.creatorId !== creatorA && creatorSession.creatorId !== creatorB) {
      return res.status(403).json({ error: 'You can only propose battles you\u2019re part of.' });
    }
    if (!localDateTime) return res.status(400).json({ error: 'Missing date/time.' });

    // 20 battles per 10 minutes per actor — generous for real bulk
    // scheduling, but stops a scripted loop from spamming battle rows
    // (and the push notification that fires on every one of them).
    const rateKey = proposerId ? `battle:creator:${proposerId}` : `battle:admin:${agencyId}`;
    const rate = await checkAndRecordActionRate(rateKey, 10, 20);
    if (!rate.allowed) return res.status(429).json({ error: `Too many battles booked too fast — try again in ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s).` });

    const { status, trialEndsAt } = await getAgencyStatus(agencyId);
    if (!canWrite(status, trialEndsAt)) return res.status(402).json({ error: 'This agency\u2019s subscription is inactive. Contact your agency admin.' });

    const { data: bothCreators, error: cErr } = await supabaseAdmin
      .from('creators').select('id, agency_id').in('id', [creatorA, creatorB]);
    if (cErr) return res.status(500).json({ error: cErr.message });
    const valid = bothCreators.length === 2 && bothCreators.every((c) => c.agency_id === agencyId);
    if (!valid) return res.status(403).json({ error: 'Both creators must belong to this agency.' });

    const zone = zoneByCode(zoneCode);
    const utcDate = zonedTimeToUtc(localDateTime, zone.iana);
    const acceptedA = proposerId === creatorA;
    const acceptedB = proposerId === creatorB;

    const { data, error } = await supabaseAdmin
      .from('battles')
      .insert({
        agency_id: agencyId, creator_a: creatorA, creator_b: creatorB,
        datetime_utc: utcDate.toISOString(), zone_code: zone.code,
        notes: notes || null, accepted_a: acceptedA, accepted_b: acceptedB,
        declined: false, created_by: proposerId
      })
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });

    if (proposerId) {
      const invitee = proposerId === creatorA ? creatorB : creatorA;
      const { data: proposer } = await supabaseAdmin.from('creators').select('name').eq('id', proposerId).single();
      await notifyCreator(invitee, {
        title: 'New battle invite',
        body: `${proposer ? proposer.name : 'Someone'} wants to battle you. Open Battle Room to respond.`,
        url: '/app'
      });
    } else {
      // Admin-booked battle — neither side proposed it, so notify both.
      await Promise.all([creatorA, creatorB].map((id) => notifyCreator(id, {
        title: 'A battle was scheduled for you',
        body: 'Your agency booked a battle for you — open Battle Room to confirm.',
        url: '/app'
      })));
    }

    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
