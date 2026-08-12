import { readSession, COOKIES } from '../../lib/session';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { checkLock, recordFailure, recordSuccess } from '../../lib/rateLimit';
import { createAuthToken } from '../../lib/authTokens';
import { sendEmail } from '../../lib/emailAdmin';
import { logError } from '../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });

  const identifier = `resend-verify:${session.agencyId}`;
  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  const { data: agency } = await supabaseAdmin.from('agencies').select('id, name, contact_email, contact_email_verified').eq('id', session.agencyId).single();
  if (!agency?.contact_email) return res.status(400).json({ error: 'No contact email on file.' });
  if (agency.contact_email_verified) return res.status(200).json({ alreadyVerified: true });

  try {
    const token = await createAuthToken({ type: 'email_verify', agencyId: agency.id, email: agency.contact_email });
    const origin = req.headers.origin || `https://${req.headers.host}`;
    await sendEmail({
      to: agency.contact_email,
      subject: `Confirm your email for ${agency.name}`,
      html: `<p>Please confirm this is your real contact email — it's what you'll use for billing codes, password resets, and invites.</p>
             <p><a href="${origin}/verify-email?token=${token}">Confirm my email</a></p>
             <p>This link expires in 48 hours.</p>`
    });
    await recordSuccess(identifier);
  } catch (err) {
    await logError('resend-verification', err);
    return res.status(500).json({ error: 'Could not send the email. Try again shortly.' });
  }

  return res.status(200).json({ sent: true });
}
