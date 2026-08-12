import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

// Generates a new TOTP secret for a person setting up 2FA, plus a QR code
// (as a data URL, ready to drop straight into an <img> tag) their
// authenticator app (Google Authenticator, Authy, 1Password, etc.) scans.
export async function generateTotpSetup(email) {
  const secret = await generateSecret();
  const otpauthUrl = await generateURI({ issuer: 'Battle Room', label: email, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, qrDataUrl };
}

// Verifies a 6-digit code against a stored secret. otplib's default
// window tolerates the code from one step before/after — accounts for
// small clock drift between the person's phone and our server, which is
// standard practice for TOTP (otherwise a slightly-off clock locks people
// out constantly).
export async function verifyTotpCode(secret, code) {
  if (!secret || !code) return false;
  try {
    const result = await verify({ secret, token: String(code).trim() });
    return !!result?.valid;
  } catch (e) {
    return false;
  }
}
