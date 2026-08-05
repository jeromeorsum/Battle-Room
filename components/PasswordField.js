import { useState } from 'react';

function EyeIcon({ open }) {
  // open = showing plain text (eye, no slash). closed = hidden (eye with a slash), which is the default state.
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <line x1="2" y1="2" x2="22" y2="22" />}
    </svg>
  );
}

export default function PasswordField({ value, onChange, placeholder, autoFocus, maxLength, minLength, id }) {
  const [visible, setVisible] = useState(false); // hidden (eye-with-slash) is the default
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={maxLength}
        minLength={minLength}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide' : 'Show'}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
          padding: 4, width: 'auto', minHeight: 0, display: 'flex', alignItems: 'center'
        }}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}
