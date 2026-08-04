const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I — avoids mixups

export function generateAgencyCode(length = 8) {
  let code = '';
  for (let i = 0; i < length; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}
