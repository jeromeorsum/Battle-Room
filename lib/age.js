// Age verification from a date of birth.
//
// Idaho (like most U.S. jurisdictions) treats 18 as the age of majority, and
// this platform is adults-only. Rather than trust a checkbox alone, the
// server computes the actual age from the submitted date of birth and rejects
// anyone under 18. The checkbox stays as an explicit attestation; the DOB is
// the verifiable gate.

export const MIN_AGE = 18;

// Returns whole-years age for a YYYY-MM-DD date string, or null if the input
// isn't a valid, real, non-future date. Uses UTC to avoid off-by-one from
// timezones, and accounts for whether this year's birthday has happened yet.
export function ageFromDOB(dobString) {
  if (!dobString || typeof dobString !== 'string') return null;
  const m = dobString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  const dob = new Date(Date.UTC(year, month - 1, day));
  // Reject impossible dates (e.g. 2026-02-31 rolls over) and future dates.
  if (dob.getUTCFullYear() !== year || dob.getUTCMonth() !== month - 1 || dob.getUTCDate() !== day) return null;
  const now = new Date();
  if (dob.getTime() > now.getTime()) return null;
  // Sanity floor: nobody is 120+; guards against typos like year 1300.
  let age = now.getUTCFullYear() - year;
  const hadBirthdayThisYear =
    now.getUTCMonth() > month - 1 ||
    (now.getUTCMonth() === month - 1 && now.getUTCDate() >= day);
  if (!hadBirthdayThisYear) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

// True only if the DOB is valid AND the person is at least MIN_AGE.
export function isAdultDOB(dobString) {
  const age = ageFromDOB(dobString);
  return age !== null && age >= MIN_AGE;
}
