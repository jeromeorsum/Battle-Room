import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { generateAgencyCode } from '../../../lib/codes';
import { logAudit } from '../../../lib/auditLog';
import { checkAndRecordActionRate } from '../../../lib/rateLimit';

const INVITE_TTL_HOURS = 24;
const MAX_BULK = 100;

// Managing invites is part of managing the roster, so admins AND managers can
// generate/list them (same as they can both add creators directly). Only the
// shared-code toggle is admin-only, and that lives in its own endpoint.
function requireAgencyStaff(req, res) {
  const session = readSession(req, COOKIES.ADMIN);
  if (!session) { res.status(401).json({ error: 'Log in first.' }); return null; }
  if (session.role !== 'admin' && session.role !== 'manager') { res.status(403).json({ error: 'Not authorized.' }); return null; }
  return session;
}

// Derived status: a pending invite whose expiry has passed reads as "expired".
function withDerivedStatus(row) {
  if (row.status === 'pending' && new Date(row.expires_at).getTime() < Date.now()) {
    return { ...row, status: 'expired' };
  }
  return row;
}

export default async function handler(req, res) {
  const session = requireAgencyStaff(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('creator_invites')
      .select('id, code, label, status, created_at, expires_at, redeemed_at, redeemed_by')
      .eq('agency_id', session.agencyId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ invites: (data || []).map(withDerivedStatus) });
  }

  if (req.method === 'POST') {
    // Light rate limit so a script can't mint thousands of codes.
    const rate = await checkAndRecordActionRate(`invite-gen:${session.agencyId}`, 10, 20);
    if (!rate.allowed) return res.status(429).json({ error: 'Generating invites too fast — try again shortly.' });

    let { count, label } = req.body || {};
    count = parseInt(count, 10) || 1;
    if (count < 1) count = 1;
    if (count > MAX_BULK) return res.status(400).json({ error: `You can generate at most ${MAX_BULK} invites at once.` });
    const cleanLabel = label ? String(label).trim().slice(0, 80) : null;

    const expires_at = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push({ agency_id: session.agencyId, code: generateAgencyCode(8), label: cleanLabel, status: 'pending', expires_at });
    }

    const { data, error } = await supabaseAdmin
      .from('creator_invites')
      .insert(rows)
      .select('id, code, label, status, created_at, expires_at');
    if (error) return res.status(500).json({ error: error.message });

    await logAudit(session.agencyId, session.role === 'admin' ? 'Admin' : 'Manager', 'Generated invites', `${count} invite code(s)${cleanLabel ? ` (${cleanLabel})` : ''}`);
    return res.status(201).json({ invites: data });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
