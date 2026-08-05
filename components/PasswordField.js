import { useState } from 'react';

export default function PasswordField({ value, onChange, placeholder, autoFocus, maxLength, minLength, id }) {
  const [visible, setVisible] = useState(false);
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
          fontSize: 16, padding: 4, width: 'auto', minHeight: 0
        }}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  );
}
