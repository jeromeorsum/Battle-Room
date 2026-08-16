import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET;

// Short, non-reversible fingerprint of a creator's current pin_hash. We
// stamp this into the session at login and re-check it on each session
// validation — because bcrypt produces a brand-new hash every time a PIN
// is set, changing (or admin-resetting) a PIN changes this fingerprint,
// which invalidates every existing 30-day session for that creator on its
// next check. Truncated because we only need enough bits to detect a
// change, not to store the hash itself.
export function pinFingerprint(pinHash) {
  if (!pinHash) return '';
  return crypto.createHash('sha256').update(pinHash).digest('hex').slice(0, 16);
}

function assertSecret() {
  if (!SECRET) throw new Error('SESSION_SECRET is not set. See .env.example.');
}

// Minimal, dependency-free cookie serialize/parse — avoids relying on
// packages that only ship ESM builds, which can break in some serverless
// bundling setups.
function serializeCookie(name, value, opts) {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAge != null) str += `; Max-Age=${Math.floor(opts.maxAge)}`;
  str += `; Path=${opts.path || '/'}`;
  if (opts.httpOnly) str += '; HttpOnly';
  if (opts.secure) str += '; Secure';
  if (opts.sameSite) str += `; SameSite=${opts.sameSite}`;
  return str;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

// Cookies are httpOnly (JavaScript can't read them, so XSS can't steal them),
// Secure (HTTPS only), and SameSite=Strict (the browser won't send them on
// cross-site requests, which blocks CSRF without needing a separate token).
const COOKIE_OPTS = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' };

export function setSessionCookie(res, name, payload, maxAgeSeconds) {
  assertSecret();
  const token = jwt.sign(payload, SECRET, { expiresIn: maxAgeSeconds });
  const cookie = serializeCookie(name, token, { ...COOKIE_OPTS, maxAge: maxAgeSeconds });
  appendCookie(res, cookie);
}

export function clearSessionCookie(res, name) {
  const cookie = serializeCookie(name, '', { ...COOKIE_OPTS, maxAge: 0 });
  appendCookie(res, cookie);
}

function appendCookie(res, cookie) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) return res.setHeader('Set-Cookie', cookie);
  const arr = Array.isArray(existing) ? existing : [existing];
  res.setHeader('Set-Cookie', [...arr, cookie]);
}

export function readSession(req, name) {
  assertSecret();
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[name];
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null; // expired or tampered — treat as not logged in
  }
}

// Cookie name constants, kept in one place so a typo can't silently create
// a second, unprotected session.
export const COOKIES = {
  AGENCY_SCOPE: 'br_agency_scope', // proves "I know this agency's code"
  CREATOR: 'br_creator_session', // proves "I am this specific creator"
  ADMIN: 'br_admin_session', // proves "I am an admin of this agency"
  SUPERADMIN: 'br_superadmin_session', // proves "I am the platform owner"
  SUPERADMIN_PENDING_2FA: 'br_superadmin_pending_2fa', // proves "I passed the super admin code, not yet the 2FA step"
  PENDING_2FA: 'br_pending_2fa' // proves "I passed step 1 (password), not yet step 2 (TOTP)"
};
