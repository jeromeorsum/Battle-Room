import { supabaseAdmin } from './supabaseAdmin';

// Logs to Supabase's error_logs table AND the normal server console, so you
// can see problems either in Vercel's logs or by querying the table
// directly in Supabase — no external monitoring account required. If you
// later add Sentry or similar, you can drop this in alongside it (or
// instead of it) without touching every route again.
export async function logError(route, err) {
  console.error(`[${route}]`, err);
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
