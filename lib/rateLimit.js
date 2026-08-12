import { supabaseAdmin } from './supabaseAdmin';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Call before attempting to verify a code/PIN. Returns { allowed, retryAfterSeconds }.
export async function checkLock(identifier) {
  const { data } = await supabaseAdmin.from('auth_attempts').select('*').eq('identifier', identifier).single();
  if (!data || !data.locked_until) return { allowed: true };
  const lockedUntil = new Date(data.locked_until);
  if (lockedUntil > new Date()) {
    return { allowed: false, retryAfterSeconds: Math.ceil((lockedUntil - new Date()) / 1000) };
  }
  return { allowed: true };
}

// Call after a failed attempt. Locks the identifier out once the threshold is hit.
export async function recordFailure(identifier) {
  const { data } = await supabaseAdmin.from('auth_attempts').select('*').eq('identifier', identifier).single();
  const attempts = (data?.attempts || 0) + 1;
  const locked_until = attempts >= MAX_ATTEMPTS
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString()
    : null;
  await supabaseAdmin.from('auth_attempts').upsert({ identifier, attempts, locked_until, updated_at: new Date().toISOString() });
}

// Call after a successful attempt to reset the counter.
export async function recordSuccess(identifier) {
  await supabaseAdmin.from('auth_attempts').upsert({ identifier, attempts: 0, locked_until: null, updated_at: new Date().toISOString() });
}

const IP_WINDOW_MINUTES = 10;
const IP_MAX_REQUESTS = 40;

// A second, coarser layer on top of the per-identifier lockout above.
// Per-identifier lockout stops someone brute-forcing ONE agency code or
// email; it does nothing to stop someone trying many different codes/
// emails from the same IP. This closes that gap: no more than
// IP_MAX_REQUESTS auth-related requests per IP per rolling window,
// regardless of which identifier each one targets.
export async function checkAndRecordIpRequest(ip) {
  if (!ip) return { allowed: true }; // fail open if we genuinely can't tell — never lock everyone out over a missing header
  const identifier = `ip:${ip}`;
  const { data } = await supabaseAdmin.from('auth_attempts').select('*').eq('identifier', identifier).single();
  const now = new Date();

  if (data?.locked_until && new Date(data.locked_until) > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((new Date(data.locked_until) - now) / 1000) };
  }

  const windowStart = data?.updated_at ? new Date(data.updated_at) : null;
  const windowExpired = !windowStart || (now - windowStart) > IP_WINDOW_MINUTES * 60000;
  const nextCount = windowExpired ? 1 : (data?.attempts || 0) + 1;
  const locked_until = nextCount > IP_MAX_REQUESTS ? new Date(now.getTime() + IP_WINDOW_MINUTES * 60000).toISOString() : null;

  await supabaseAdmin.from('auth_attempts').upsert({ identifier, attempts: nextCount, locked_until, updated_at: now.toISOString() });
  if (locked_until) return { allowed: false, retryAfterSeconds: IP_WINDOW_MINUTES * 60 };
  return { allowed: true };
}
