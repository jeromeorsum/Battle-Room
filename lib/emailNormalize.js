// Catches the most common "make a new trial account" tricks: Gmail ignores
// dots in the local part, and most providers ignore anything after a "+".
// This isn't foolproof (a genuinely different email still works), but it
// closes the laziest, most common loophole for free.
export function normalizeEmailForTrialCheck(email) {
  const trimmed = email.trim().toLowerCase();
  const [local, domain] = trimmed.split('@');
  if (!local || !domain) return trimmed;
  const noTag = local.split('+')[0];
  const noDots = domain.includes('gmail.com') ? noTag.replace(/\./g, '') : noTag;
  return `${noDots}@${domain}`;
}
