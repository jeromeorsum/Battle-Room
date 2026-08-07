import { useEffect, useRef, useState } from 'react';

const PRESETS = Array.from({ length: 51 }, (_, i) => i * 10000); // 0 to 500,000 in 10k steps

function roundTo10k(n) {
  return Math.round((Number(n) || 0) / 10000) * 10000;
}

// A custom dropdown instead of native <datalist> — browsers render datalist
// popups at whatever height fits all the options, which is exactly what
// made this take over the screen. This version caps the list at a fixed,
// scrollable height so it stays compact no matter how many presets there are.
export default function DiamondInput({ value, onChange }) {
  const [text, setText] = useState(String(value ?? 0));
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setText(String(value ?? 0)); }, [value]);

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function commit(raw) {
    const rounded = roundTo10k(raw);
    setText(String(rounded));
    onChange(rounded);
  }

  function pick(v) {
    setText(String(v));
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="number"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(e.target.value); setOpen(false); } if (e.key === 'Escape') setOpen(false); }}
          placeholder="e.g. 10000"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Quick pick"
          style={{ width: 40, minHeight: 0, background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--text-dim)', cursor: 'pointer' }}
        >
          ▾
        </button>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
          background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 8,
          maxHeight: 180, overflowY: 'auto'
        }}>
          {PRESETS.map((p) => (
            <div
              key={p}
              onClick={() => pick(p)}
              style={{ padding: '7px 12px', fontSize: 13, cursor: 'pointer', color: p === Number(text) ? 'var(--gold)' : 'var(--text)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {p.toLocaleString()} 💎
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
