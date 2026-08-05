import { useEffect, useId, useState } from 'react';

const PRESETS = Array.from({ length: 51 }, (_, i) => i * 10000); // 0 to 500,000 in 10k steps

function roundTo10k(n) {
  return Math.round((Number(n) || 0) / 10000) * 10000;
}

// One box: type any number (rounds to the nearest 10k when you leave the
// field) or click the little dropdown arrow to pick a clean preset — a
// native <input list> + <datalist> combo does both in a single field.
export default function DiamondInput({ value, onChange }) {
  const listId = useId();
  const [text, setText] = useState(String(value ?? 0));

  useEffect(() => { setText(String(value ?? 0)); }, [value]);

  function commit(raw) {
    const rounded = roundTo10k(raw);
    setText(String(rounded));
    onChange(rounded);
  }

  return (
    <>
      <input
        type="number"
        list={listId}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(e.target.value); } }}
        placeholder="e.g. 10000"
      />
      <datalist id={listId}>
        {PRESETS.map((p) => <option key={p} value={p} />)}
      </datalist>
    </>
  );
}
