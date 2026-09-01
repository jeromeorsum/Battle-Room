import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session || session.role !== 'superadmin') return res.status(401).json({ error: 'Not authorized.' });

  const { data: rows, error } = await supabaseAdmin
    .from('feedback_submissions')
    .select('id, message, submitted_by, agency_id, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return res.status(500).json({ error: error.message });

  // Attach agency names (one lookup for the agencies referenced).
  const agencyIds = [...new Set((rows || []).map((r) => r.agency_id).filter(Boolean))];
  let names = {};
  if (agencyIds.length) {
    const { data: ags } = await supabaseAdmin.from('agencies').select('id, name').in('id', agencyIds);
    names = Object.fromEntries((ags || []).map((a) => [a.id, a.name]));
  }

  const feedback = (rows || []).map((r) => ({
    id: r.id,
    message: r.message,
    submittedBy: r.submitted_by || 'Unknown',
    agency: r.agency_id ? (names[r.agency_id] || 'Unknown agency') : 'Not signed in',
    createdAt: r.created_at
  }));

  return res.status(200).json({ feedback });
}
