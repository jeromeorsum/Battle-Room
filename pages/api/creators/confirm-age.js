import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';
import { isAdultDOB } from '../../../lib/age';

// A creator whose profile was created by an agency admin must confirm their
// OWN age before they can use the account. The admin's attestation gets them
// a profile; this endpoint is where the actual person verifies they're 18+
// with their own date of birth. Only the logged-in creator can confirm their
// own account.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.CREATOR);
  if (!session) return res.status(401).json({ error: 'Please sign in first.' });

  const { dateOfBirth, ageAttested } = req.body;
  if (!ageAttested) return res.status(400).json({ error: 'Please confirm you are 18 or older.' });
  if (!dateOfBirth) return res.status(400).json({ error: 'Please enter your date of birth.' });
  if (!isAdultDOB(dateOfBirth)) return res.status(400).json({ error: 'You must be at least 18 years old to use this platform. Please enter a valid date of birth.' });

  const { error } = await supabaseAdmin
    .from('creators')
    .update({
      age_self_confirmed: true,
      date_of_birth: dateOfBirth,
      age_attested: true,
      age_attested_at: new Date().toISOString()
    })
    .eq('id', session.creatorId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
