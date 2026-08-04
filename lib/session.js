import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';

const SECRET = process.env.SESSION_SECRET;

function assertSecret() {
  if (!SECRET) throw new Error('SESSION_SECRET is not set. See .env.example.');
}

// Cookies are httpOnly (JavaScript can't read them, so XSS can't steal them),
// Secure (HTTPS only), and SameSite=Strict (the browser won't send them on
// cross-site requests, which blocks CSRF without needing a separate token).
const COOKIE_OPTS = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' };

export function setSessionCookie(res, name, payload, maxAgeSeconds) {
  assertSecret();
  const token = jwt.sign(payload, SECRET, { expiresIn: maxAgeSeconds });
  const cookie = serialize(name, token, { ...COOKIE_OPTS, maxAge: maxAgeSeconds });
  appendCookie(res, cookie);
}

export function clearSessionCookie(res, name) {
  const cookie = serialize(name, '', { ...COOKIE_OPTS, maxAge: 0 });
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
  const cookies = parse(req.headers.cookie || '');
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
  SUPERADMIN: 'br_superadmin_session' // proves "I am the platform owner"
};
