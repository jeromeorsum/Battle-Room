function toICSDate(d) {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
function escapeICS(str) {
  return String(str == null ? '' : str).replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
}

// Downloads a .ics file — works with the native calendar app on iPhone,
// Android, Mac, and Windows (Apple Calendar, Outlook, etc.) since it's an
// open standard, not something specific to one calendar provider.
export function downloadICS({ id, title, notes, startUTC, durationMinutes = 30 }) {
  const start = new Date(startUTC);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Battle Room//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${id}@battleroom`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(notes || '')}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `battle-${id}.ics`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Opens Google Calendar's "add event" page pre-filled — this is Google's
// own URL format, not an API integration, so it needs no API key or setup.
export function googleCalendarUrl({ title, notes, startUTC, durationMinutes = 30 }) {
  const start = new Date(startUTC);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toICSDate(start)}/${toICSDate(end)}`,
    details: notes || ''
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
