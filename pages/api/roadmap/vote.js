import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Missing itemId.' });

  const { data: item } = await supabaseAdmin.from('roadmap_items').select('votes').eq('id', itemId).single();
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  const { data, error } = await supabaseAdmin.from('roadmap_items').update({ votes: item.votes + 1 }).eq('id', itemId).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
