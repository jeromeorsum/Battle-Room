import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/emailAdmin';
import { checkLock, recordFailure, recordSuccess } from '../../lib/rateLimit';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { agencyCode, contactEmail } = req.body;
  if (!agencyCode || !contactEmail) return res.status(400).json({ error: 'Agency code and contact email are required.' });

  const identifier = `forgot-admin:${agencyCode.trim().toUpperCase()}`;
  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  const { data: agency } = await supabaseAdmin
    .from('agencies').select('id, contact_email').eq('agency_code', agencyCode.trim().toUpperCase()).single();

  // Always respond the same way whether or not it matched, so this can't be
  // used to check which emails are registered to which agency codes.
  const genericResponse = { ok: true, message: 'If that agency code and email match, a reset link has been sent.' };

  if (!agency || agency.contact_email?.toLowerCase() !== contactEmail.trim().toLowerCase()) {
    await recordFailure(identifier);
    return res.status(200).json(genericResponse);
  }

  await recordSuccess(identifier);

  const token = crypto.randomBytes(32).toString('hex');
  const token_hash = await bcrypt.hash(token, 10);
  await supabaseAdmin.from('password_resets').insert({
    agency_id: agency.id, token_hash, expires_at: new Date(Date.now() + 30 * 60000).toISOString()
  });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const resetUrl = `${origin}/reset-admin-code?agencyId=${agency.id}&token=${token}`;

  try {
    await sendEmail({
      to: contactEmail,
      subject: 'Reset your Battle Room Clash admin code',
      html: `<p>Someone requested an admin code reset for your Battle Room Clash agency.</p>
             <p><a href="${resetUrl}">Click here to set a new admin code</a> — this link expires in 30 minutes.</p>
             <p>If you didn't request this, you can safely ignore this email.</p>`
    });
  } catch (err) {
    console.error('Failed to send reset email:', err.message);
    return res.status(500).json({ error: 'Could not send the reset email. Is RESEND_API_KEY configured? See RESEND_SETUP.md.' });
  }

  return res.status(200).json(genericResponse);
}
