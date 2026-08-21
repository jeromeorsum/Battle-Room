import { useEffect, useRef, useState } from 'react';

const LINKS = [
  { href: '/', label: '🏠 Home' },
  { href: '/app', label: '🎥 Streamer Login' },
  { href: '/signup', label: '✍️ Sign Up My Agency' },
  { href: '/admin', label: '🛠 Agency Login' },
  { href: '/help', label: '❓ Help & FAQ' },
  { href: '/feedback', label: '💬 Send Feedback' },
  { href: '/changelog', label: '📋 What\u2019s New' },
  { href: '/status', label: '🟢 System Status' },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEscape(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <div ref={ref} className="nav-menu-wrap" style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 14px)', right: 'calc(env(safe-area-inset-right, 0px) + 14px)', zIndex: 9998 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--gold)',
          fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.55)'
        }}
      >
        {open ? '✕' : '☰'}
      </button>
      {open && (
        <div className="card" style={{ position: 'absolute', top: 52, right: 0, minWidth: 220, padding: 8 }}>
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                display: 'block', padding: '10px 12px', borderRadius: 8, color: 'var(--text)',
                textDecoration: 'none', fontSize: 14
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
