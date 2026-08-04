export const ZONES = [
  { code: 'AKT', label: 'Alaska (AKT)', iana: 'America/Anchorage' },
  { code: 'HT', label: 'Hawaii (HT)', iana: 'Pacific/Honolulu' },
  { code: 'PT', label: 'Pacific (PT)', iana: 'America/Los_Angeles' },
  { code: 'MT', label: 'Mountain (MT)', iana: 'America/Denver' },
  { code: 'CT', label: 'Central (CT)', iana: 'America/Chicago' },
  { code: 'ET', label: 'Eastern (ET)', iana: 'America/New_York' },
  { code: 'AT', label: 'Atlantic — Canada (AT)', iana: 'America/Halifax' }
];

export const BATTLE_TYPES = [
  { key: 'dare', label: 'Dare' },
  { key: 'punishment', label: 'Punishment' },
  { key: 'toxic', label: 'Toxic' },
  { key: 'chill', label: 'Chill' }
];

// Generates A1, A2, A3, A4, A5, B1, ... D5 — edit the tier letters or the
// sub-rank range here if your agency uses a different league system.
export const LEAGUE_OPTIONS = ['A', 'B', 'C', 'D'].flatMap((tier) =>
  [1, 2, 3, 4, 5].map((n) => `${tier}${n}`)
);

export function zoneByCode(code) {
  return ZONES.find((z) => z.code === code) || ZONES.find((z) => z.code === 'ET');
}

// Converts a "YYYY-MM-DDTHH:MM" wall-clock value in a given IANA zone
// into a real UTC Date, correctly accounting for DST.
export function zonedTimeToUtc(localValue, ianaZone) {
  const [datePart, timePart] = localValue.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = timePart.split(':').map(Number);
  let utc = Date.UTC(y, mo - 1, d, h, mi, 0);
  for (let i = 0; i < 2; i++) {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaZone, hour12: false, year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const map = {};
    dtf.formatToParts(new Date(utc)).forEach((p) => { if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10); });
    let hh = map.hour; if (hh === 24) hh = 0;
    const readAsUtc = Date.UTC(map.year, map.month - 1, map.day, hh, map.minute, map.second);
    utc += Date.UTC(y, mo - 1, d, h, mi, 0) - readAsUtc;
  }
  return new Date(utc);
}
