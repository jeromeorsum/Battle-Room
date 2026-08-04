import { createClient } from '@supabase/supabase-js';

// This client uses the SERVICE ROLE key, which has full database access
// and bypasses Row Level Security. It must only ever be imported from
// files under /pages/api — never from a page/component that ships to
// the browser, or you'd leak full DB access to anyone who opens devtools.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
