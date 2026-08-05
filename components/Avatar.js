export default function Avatar({ url, name, size = 36 }) {
  const initials = (name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const style = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-raised)', border: '1px solid var(--line)',
    color: 'var(--gold)', fontWeight: 700, fontSize: size * 0.4, overflow: 'hidden'
  };
  if (url) {
    return <img src={url} alt={name || 'avatar'} style={{ ...style, objectFit: 'cover' }} />;
  }
  return <div style={style}>{initials}</div>;
}
