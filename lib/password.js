import bcrypt from 'bcryptjs';

// Minimum bar for an individual login password — deliberately length-based
// rather than requiring a mix of symbols/numbers, since length is the
// stronger predictor of real-world strength and composition rules mostly
// just push people toward "Password1!" patterns.
export function passwordIssue(password) {
  if (!password || password.length < 10) return 'Password must be at least 10 characters.';
  return null;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
