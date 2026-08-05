const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = [0, 10, 20, 30, 40, 50];

function parseValue(value) {
  if (!value) return { date: '', hour: 7, minute: 0, ampm: 'PM' };
  const [date, time] = value.split('T');
  let [h, m] = (time || '19:00').split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12; if (hour12 === 0) hour12 = 12;
  const roundedMin = MINUTES.reduce((best, cur) => (Math.abs(cur - m) < Math.abs(best - m) ? cur : best), 0);
  return { date, hour: hour12, minute: roundedMin, ampm };
}

function buildValue(date, hour, minute, ampm) {
  if (!date) return '';
  let h24 = hour % 12;
  if (ampm === 'PM') h24 += 12;
  return `${date}T${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// value/onChange work with the same "YYYY-MM-DDTHH:MM" format as a native
// datetime-local input, so it's a drop-in replacement everywhere else in
// the app that expects that format.
export default function DateTimePicker({ value, onChange }) {
  const { date, hour, minute, ampm } = parseValue(value);

  function update(patch) {
    const next = { date, hour, minute, ampm, ...patch };
    onChange(buildValue(next.date, next.hour, next.minute, next.ampm));
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, minWidth: 0 }}>
      <input type="date" value={date} onChange={(e) => update({ date: e.target.value })} style={{ flex: '1.4 1 0', minWidth: 100 }} />
      <select value={hour} onChange={(e) => update({ hour: Number(e.target.value) })} style={{ flex: '0.7 1 0', minWidth: 46 }}>
        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <select value={minute} onChange={(e) => update({ minute: Number(e.target.value) })} style={{ flex: '0.8 1 0', minWidth: 54 }}>
        {MINUTES.map((m) => <option key={m} value={m}>:{String(m).padStart(2, '0')}</option>)}
      </select>
      <select value={ampm} onChange={(e) => update({ ampm: e.target.value })} style={{ flex: '0.7 1 0', minWidth: 50 }}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
