import { createClient } from '@supabase/supabase-js';

// Safe for the browser: this uses the public anon key, and RLS on every
// table blocks it from reading/writing directly. The frontend never
// queries Supabase directly — it calls our /api routes instead, which
// use the service-role key server-side. This file is kept for future use
// (e.g. Supabase Realtime subscriptions) but isn't required for the
// core app to work.
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
