import { useEffect, useState } from 'react';

const PRESETS = Array.from({ length: 51 }, (_, i) => i * 10000); // 0 to 500,000 in 10k steps

function roundTo10k(n) {
  return Math.round((Number(n) || 0) / 10000) * 10000;
}

// value/onChange work in plain numbers, same as a native number input — this
// is a drop-in replacement for diamond fields elsewhere in the app.
export default function DiamondInput({ value, onChange }) {
  const [text, setText] = useState(String(value ?? 0));

  useEffect(() => { setText(String(value ?? 0)); }, [value]);

  function commitText() {
    const rounded = roundTo10k(text);
    setText(String(rounded));
    onChange(rounded);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, minWidth: 0 }}>
      <input
        type="number"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitText(); } }}
        placeholder="e.g. 10000"
        style={{ flex: '1.3 1 0', minWidth: 90 }}
      />
      <select
        value={PRESETS.includes(value) ? value : ''}
        onChange={(e) => { const v = Number(e.target.value); onChange(v); setText(String(v)); }}
        style={{ flex: '1 1 0', minWidth: 100 }}
      >
        <option value="" disabled>Quick pick…</option>
        {PRESETS.map((p) => <option key={p} value={p}>{p.toLocaleString()}</option>)}
      </select>
    </div>
  );
}
