import { NextResponse } from 'next/server';

// Every route matched below checks a password, PIN, code, or token — the
// exact routes that already have per-identifier lockout (see
// lib/rateLimit.js). This adds a per-IP ceiling on top, so no single IP
// can hammer many different agency codes/emails/PINs to route around
// per-identifier lockout entirely.

export const config = {
  matcher: [
    '/api/login',
    '/api/admin-login',
    '/api/super-admin/login',
    '/api/agencies/resolve',
    '/api/forgot-admin-code',
    '/api/billing/request-code',
    '/api/agency-users/login',
    '/api/agency-users/verify-2fa',
    '/api/agency-users/forgot-password',
    '/api/agency-users/reset-password',
    '/api/agency-users/accept-invite'
  ]
};

export default async function middleware(req) {
  // Runs on Vercel's Edge Runtime, so it calls Supabase's REST API
  // directly over fetch rather than importing the Node service-role
  // client — same effect (checks/updates the auth_attempts table), just
  // Edge-compatible.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || null;
  if (!ip) return NextResponse.next();

  const identifier = `ip:${ip}`;
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return NextResponse.next(); // fail open rather than break the whole app if env vars are ever missing

  try {
    const getRes = await fetch(`${base}/rest/v1/auth_attempts?identifier=eq.${encodeURIComponent(identifier)}&select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    const rows = await getRes.json();
    const existing = Array.isArray(rows) ? rows[0] : null;
    const now = new Date();

    if (existing?.locked_until && new Date(existing.locked_until) > now) {
      return NextResponse.json({ error: 'Too many requests from this network. Please slow down and try again shortly.' }, { status: 429 });
    }

    const windowStart = existing?.updated_at ? new Date(existing.updated_at) : null;
    const windowExpired = !windowStart || (now - windowStart) > 10 * 60000;
    const nextCount = windowExpired ? 1 : (existing?.attempts || 0) + 1;
    const locked_until = nextCount > 40 ? new Date(now.getTime() + 10 * 60000).toISOString() : null;

    await fetch(`${base}/rest/v1/auth_attempts?on_conflict=identifier`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ identifier, attempts: nextCount, locked_until, updated_at: now.toISOString() })
    });

    if (locked_until) return NextResponse.json({ error: 'Too many requests from this network. Please slow down and try again shortly.' }, { status: 429 });
  } catch (e) {
    // If the throttle check itself fails for any reason, don't take the
    // whole app down over it — fail open and let the route's own
    // per-identifier lockout still apply.
  }

  return NextResponse.next();
}
