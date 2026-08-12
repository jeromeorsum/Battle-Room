import crypto from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

const TOKEN_TTL_HOURS = { invite: 72, reset: 1 };

// A random, unguessable, URL-safe token — not a 6-digit code, since this
// goes in an email link rather than being typed in, so it can (and
// should) be much longer than something a person types manually.
function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export async function createAuthToken({ type, agencyId, email, agencyUserId = null, role = null }) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS[type] * 60 * 60 * 1000).toISOString();
  await supabaseAdmin.from('auth_tokens').insert({
    token, type, agency_id: agencyId, email: email.toLowerCase().trim(),
    agency_user_id: agencyUserId, role, expires_at: expiresAt
  });
  return token;
}

// Looks up a token and confirms it's real, unused, and unexpired — but
// does NOT mark it used. Callers check validity first, do their work
// (e.g. show a "set your password" form), then call consumeAuthToken
// only once the person actually submits, so a token isn't burned just by
// loading the page.
export async function readAuthToken(token) {
  const { data } = await supabaseAdmin.from('auth_tokens').select('*').eq('token', token).single();
  if (!data) return null;
  if (data.used_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data;
}

export async function consumeAuthToken(token) {
  await supabaseAdmin.from('auth_tokens').update({ used_at: new Date().toISOString() }).eq('token', token);
}
