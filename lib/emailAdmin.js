import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail({ to, subject, html }) {
  if (!resend) throw new Error('RESEND_API_KEY is not configured. See RESEND_SETUP.md.');
  const from = process.env.RESEND_FROM_EMAIL || 'Battle Room <onboarding@resend.dev>';
  return resend.emails.send({ from, to, subject, html });
}
