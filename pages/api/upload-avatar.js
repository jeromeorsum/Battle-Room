import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { readSession, COOKIES } from '../../lib/session';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end(); }

  const session = readSession(req, COOKIES.CREATOR);
  if (!session) return res.status(401).json({ error: 'Log in first.' });

  const { dataUrl } = req.body; // e.g. "data:image/jpeg;base64,...."
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return res.status(400).json({ error: 'Invalid image.' });

  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid image format.' });
  const [, ext, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > 3 * 1024 * 1024) return res.status(400).json({ error: 'Image must be under 3MB.' });

  const path = `${session.creatorId}-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabaseAdmin.storage.from('avatars').upload(path, buffer, {
    contentType: `image/${ext}`, upsert: true
  });
  if (uploadErr) return res.status(500).json({ error: uploadErr.message });

  const { data: publicUrlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
  const avatar_url = publicUrlData.publicUrl;

  await supabaseAdmin.from('creators').update({ avatar_url }).eq('id', session.creatorId);
  return res.status(200).json({ avatar_url });
}
