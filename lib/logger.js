import { supabaseAdmin } from './supabaseAdmin';
import * as Sentry from '@sentry/nextjs';

// Logs to Supabase's error_logs table, the normal server console, AND
// Sentry — so problems show up in Vercel's logs, are queryable in
// Supabase directly, and trigger a real-time alert/dashboard entry in
// Sentry without needing to touch every route that already calls this.
export async function logError(route, err) {
  console.error(`[${route}]`, err);
  Sentry.captureException(err, { tags: { route } });
  try {
    await supabaseAdmin.from('error_logs').insert({
      route,
      message: err?.message || String(err),
      stack: err?.stack || null
    });
  } catch (e) {
    // If logging itself fails, don't let that break the actual request —
    // just note it in the console and move on.
    console.error('Failed to write to error_logs:', e.message);
  }
}
