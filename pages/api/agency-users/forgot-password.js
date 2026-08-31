import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { checkLock, recordFailure, recordSuccess } from '../../../lib/rateLimit';
import { createAuthToken } from '../../../lib/authTokens';
import { sendEmail } from '../../../lib/emailAdmin';
import { logError } from '../../../lib/logger';

const GENERIC_MESSAGE = 'If that email is registered on this agency, a reset link has been sent.';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { agencyCode, email } = req.body;
  if (!agencyCode || !email) return res.status(400).json({ error: 'Agency code and email are required.' });

  const normalizedCode = agencyCode.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  const identifier = `forgot-password:${normalizedCode}:${normalizedEmail}`;

  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });
  await recordFailure(identifier); // counts every request toward the limit, success or not — this endpoint can't leak via timing/response differences

  const { data: agency } = await supabaseAdmin.from('agencies').select('id').eq('agency_code', normalizedCode).single();
  if (!agency) return res.status(200).json({ message: GENERIC_MESSAGE }); // same response either way

  const { data: user } = await supabaseAdmin
    .from('agency_users').select('id, email').eq('agency_id', agency.id).eq('email', normalizedEmail).single();
  if (!user) return res.status(200).json({ message: GENERIC_MESSAGE });

  try {
    const token = await createAuthToken({ type: 'reset', agencyId: agency.id, email: user.email, agencyUserId: user.id });
    const origin = req.headers.origin || `https://${req.headers.host}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your Battle Room Clash password',
      html: `<p>Someone requested a password reset for your Battle Room Clash account.</p>
             <p><a href="${origin}/reset-password?token=${token}">Reset your password</a></p>
             <p>This link expires in 1 hour. If you didn't request this, you can ignore it — your password won't change.</p>`
    });
    await recordSuccess(identifier);
  } catch (err) {
    await logError('agency-users/forgot-password', err);
  }

  return res.status(200).json({ message: GENERIC_MESSAGE });
}
