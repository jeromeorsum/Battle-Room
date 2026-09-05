import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../../lib/session';

export default async function handler(req, res) {
  const session = readSession(req, COOKIES.SUPERADMIN);
  if (!session || session.role !== 'superadmin') return res.status(401).json({ error: 'Not authorized.' });

  if (req.method === 'GET') {
    const { data: rows, error } = await supabaseAdmin
      .from('feedback_submissions')
      .select('id, message, submitted_by, agency_id, created_at, read_at')
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
      createdAt: r.created_at,
      readAt: r.read_at || null
    }));

    return res.status(200).json({ feedback });
  }

  if (req.method === 'PATCH') {
    // Mark one submission as read (first expand). Idempotent: only sets
    // read_at if it isn't already set, so re-opening keeps the original time.
    const { id } = req.body || {};
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'A feedback id is required.' });

    const { error } = await supabaseAdmin
      .from('feedback_submissions')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .is('read_at', null);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id, readOnly } = req.body || {};

    if (readOnly === true) {
      // Bulk: delete every submission already marked read.
      const { data, error } = await supabaseAdmin
        .from('feedback_submissions')
        .delete()
        .not('read_at', 'is', null)
        .select('id');
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, deleted: (data || []).length });
    }

    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'A feedback id is required.' });
    const { error } = await supabaseAdmin.from('feedback_submissions').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, deleted: 1 });
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  return res.status(405).end();
}
