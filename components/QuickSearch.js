import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';

export default function QuickSearch({ creators, myId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const results = creators
    .filter((c) => c.id !== myId)
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.handle || '').toLowerCase().includes(q))
    .slice(0, 8);

  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,15,0.7)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 100 }}
    >
      <div className="card" style={{ maxWidth: 480, width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creators by name or handle…"
        />
        <div className="dim" style={{ fontSize: 11, margin: '8px 0' }}>Press Esc to close</div>
        {results.map((c) => (
          <div
            key={c.id}
            onClick={() => { onSelect(c); setOpen(false); setQuery(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Avatar url={c.avatar_url} name={c.name} size={28} />
            <span>{c.name}</span>
            <span className="dim">{c.handle}</span>
          </div>
        ))}
        {q && results.length === 0 && <p className="dim">No matches.</p>}
      </div>
    </div>
  );
}
