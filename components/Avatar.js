import { useState } from 'react';

export default function Avatar({ url, name, size = 36 }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const style = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-raised)', border: '1px solid var(--line)',
    color: 'var(--gold)', fontWeight: 700, fontSize: size * 0.4, overflow: 'hidden'
  };
  // If the image URL is broken/unreachable (e.g. storage not set up yet),
  // fall back cleanly to initials instead of showing a broken-image icon.
  if (url && !failed) {
    return <img src={url} alt={name || 'avatar'} style={{ ...style, objectFit: 'cover' }} onError={() => setFailed(true)} />;
  }
  return <div style={style}>{initials}</div>;
}
