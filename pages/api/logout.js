import { clearSessionCookie, COOKIES } from '../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { scope } = req.body; // 'creator' | 'admin' | 'agency' | 'superadmin'
  if (scope === 'creator') clearSessionCookie(res, COOKIES.CREATOR);
  else if (scope === 'admin') { clearSessionCookie(res, COOKIES.ADMIN); clearSessionCookie(res, COOKIES.AGENCY_SCOPE); }
  else if (scope === 'agency') { clearSessionCookie(res, COOKIES.CREATOR); clearSessionCookie(res, COOKIES.AGENCY_SCOPE); }
  else if (scope === 'superadmin') clearSessionCookie(res, COOKIES.SUPERADMIN);
  else return res.status(400).json({ error: 'Invalid scope.' });

  return res.status(200).json({ ok: true });
}
