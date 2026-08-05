import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  try {
    const { error } = await supabaseAdmin.from('agencies').select('id').limit(1);
    if (error) throw error;
    return res.status(200).json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch (err) {
    return res.status(503).json({ status: 'error', database: 'unreachable', message: err.message });
  }
}
