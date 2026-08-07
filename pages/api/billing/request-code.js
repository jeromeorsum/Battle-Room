import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { sendEmail } from '../../../lib/emailAdmin';
import { checkLock, recordFailure, recordSuccess } from '../../../lib/rateLimit';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Only an admin can access billing.' });

  const identifier = `billing-code:${session.agencyId}`;
  const lock = await checkLock(identifier);
  if (!lock.allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).` });

  const { data: agency } = await supabaseAdmin.from('agencies').select('contact_email').eq('id', session.agencyId).single();
  if (!agency?.contact_email) return res.status(400).json({ error: 'No contact email on file.' });

  const code = String(crypto.randomInt(100000, 999999)); // 6-digit code
  const code_hash = await bcrypt.hash(code, 10);
  await supabaseAdmin.from('billing_verifications').insert({
    agency_id: session.agencyId, code_hash, expires_at: new Date(Date.now() + 10 * 60000).toISOString()
  });

  try {
    await sendEmail({
      to: agency.contact_email,
      subject: 'Your Battle Room billing verification code',
      html: `<p>Your code is:</p><h2 style="letter-spacing:4px;">${code}</h2><p>This expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not send verification email. Is RESEND_API_KEY configured? See RESEND_SETUP.md.' });
  }

  await recordSuccess(identifier);
  return res.status(200).json({ ok: true });
}
