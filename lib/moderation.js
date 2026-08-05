// A basic starting list — edit freely. This is a blunt tool (exact-word
// matching, easy to get around with creative spelling) not a substitute
// for real moderation at scale, but it catches the obvious, lazy cases
// for free with no external service.
const BLOCKED_WORDS = ['fuck', 'shit', 'bitch', 'nigger', 'faggot', 'retard'];

export function containsBlockedContent(text) {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((w) => lower.includes(w));
}
