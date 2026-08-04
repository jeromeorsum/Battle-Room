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
