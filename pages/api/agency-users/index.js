import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { createAuthToken } from '../../../lib/authTokens';
import { sendEmail } from '../../../lib/emailAdmin';
import { logAudit } from '../../../lib/auditLog';
import { logError } from '../../../lib/logger';
import { verifyStillActive } from '../../../lib/verifyActiveSession';

export default async function handler(req, res) {
  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });

  if (req.method === 'GET') {
    const { data: users } = await supabaseAdmin
      .from('agency_users').select('id, email, role, totp_enabled, created_at, last_login_at')
      .eq('agency_id', session.agencyId).order('created_at', { ascending: true });
    return res.status(200).json(users || []);
  }

  if (req.method === 'POST') {
    if (session.role !== 'admin') return res.status(403).json({ error: 'Only an admin can invite team members.' });
    if (!(await verifyStillActive(session))) return res.status(401).json({ error: 'Your account no longer has access — log in again.' });
    const { email, role } = req.body;
    if (!email || !['admin', 'manager'].includes(role)) return res.status(400).json({ error: 'A valid email and role (admin or manager) are required.' });
    const normalizedEmail = email.trim().toLowerCase();

    const { data: existing } = await supabaseAdmin
      .from('agency_users').select('id').eq('agency_id', session.agencyId).eq('email', normalizedEmail).single();
    if (existing) return res.status(409).json({ error: 'That email is already on this agency\u2019s team.' });

    const { data: agency } = await supabaseAdmin.from('agencies').select('name').eq('id', session.agencyId).single();

    try {
      const token = await createAuthToken({ type: 'invite', agencyId: session.agencyId, email: normalizedEmail, role });
      const origin = req.headers.origin || `https://${req.headers.host}`;
      await sendEmail({
        to: normalizedEmail,
        subject: `You've been invited to ${agency?.name || 'a Battle Room Clash agency'}`,
        html: `<p>You've been invited to join <b>${agency?.name || 'a Battle Room Clash agency'}</b> as a${role === 'admin' ? 'n' : ''} <b>${role}</b>.</p>
               <p><a href="${origin}/accept-invite?token=${token}">Accept the invite and set your password</a></p>
               <p>This link expires in 72 hours. If you weren't expecting this, you can ignore it.</p>`
      });
    } catch (err) {
      await logError('agency-users/invite', err);
      return res.status(500).json({ error: 'Could not send the invite email. Check your Resend configuration.' });
    }

    await logAudit(session.agencyId, session.email || 'Admin (shared code)', `Invited ${normalizedEmail} as ${role}`, null);
    return res.status(200).json({ invited: normalizedEmail });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
