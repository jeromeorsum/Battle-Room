import bcrypt from 'bcryptjs';
import { readSession, clearSessionCookie, COOKIES } from '../../lib/session';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { stripe } from '../../lib/stripeAdmin';
import { verifyPassword } from '../../lib/password';
import { verifyStillActive } from '../../lib/verifyActiveSession';
import { logError } from '../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.ADMIN);
  if (!session) return res.status(401).json({ error: 'Log in first.' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Only an admin can delete the agency.' });
  if (!(await verifyStillActive(session))) return res.status(401).json({ error: 'Your account no longer has access — log in again.' });

  const { confirmCode, confirmName } = req.body;
  if (!confirmCode) return res.status(400).json({ error: 'Enter your admin code (or password) to confirm.' });

  const { data: agency } = await supabaseAdmin
    .from('agencies').select('id, name, admin_code_hash, stripe_subscription_id').eq('id', session.agencyId).single();
  if (!agency) return res.status(404).json({ error: 'Agency not found.' });

  // This is a hard-stop irreversible action — require BOTH the typed
  // agency name to match AND a valid credential, rather than either alone.
  if (!confirmName || confirmName.trim() !== agency.name) {
    return res.status(400).json({ error: 'Typed name doesn\u2019t match the agency name exactly.' });
  }

  let credentialOk = false;
  if (session.agencyUserId) {
    const { data: user } = await supabaseAdmin.from('agency_users').select('password_hash').eq('id', session.agencyUserId).single();
    credentialOk = user && await verifyPassword(confirmCode, user.password_hash);
  } else {
    credentialOk = await bcrypt.compare(String(confirmCode), agency.admin_code_hash);
  }
  if (!credentialOk) return res.status(401).json({ error: 'Incorrect code/password.' });

  // Cancel any live Stripe subscription first so the agency isn't still
  // being billed after their data is gone.
  if (agency.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(agency.stripe_subscription_id);
    } catch (err) {
      await logError('agency-delete:stripe-cancel', err);
      // Don't block deletion over this — flag it and keep going, since a
      // failed cancel here would otherwise leave the agency stuck unable
      // to delete their own data.
    }
  }

  // Explicit cleanup for tables that were added outside the tracked
  // schema.sql and whose cascade behavior isn't guaranteed — everything
  // else (creators, battles, agency_users, auth_tokens) does cascade from
  // agency_id per the tracked schema.
  await supabaseAdmin.from('posts').delete().eq('agency_id', agency.id);
  await supabaseAdmin.from('audit_logs').delete().eq('agency_id', agency.id);

  const { error } = await supabaseAdmin.from('agencies').delete().eq('id', agency.id);
  if (error) { await logError('agency-delete', error); return res.status(500).json({ error: 'Could not delete the agency. Try again or contact support.' }); }

  clearSessionCookie(res, COOKIES.ADMIN);
  clearSessionCookie(res, COOKIES.AGENCY_SCOPE);
  return res.status(200).json({ deleted: true });
}
