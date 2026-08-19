import test from 'node:test';
import assert from 'node:assert';
import { normalizeEmailForTrialCheck as norm } from '../lib/emailNormalize.js';

test('gmail dots are ignored (j.o.h.n == john)', () => {
  assert.strictEqual(norm('j.o.h.n@gmail.com'), norm('john@gmail.com'));
  assert.strictEqual(norm('john@gmail.com'), 'john@gmail.com');
});

test('plus-tags are stripped everywhere', () => {
  assert.strictEqual(norm('john+trial1@gmail.com'), 'john@gmail.com');
  assert.strictEqual(norm('sara+anything@outlook.com'), 'sara@outlook.com');
});

test('gmail dot+tag combo collapses to the same address', () => {
  assert.strictEqual(norm('j.o.h.n+trial99@gmail.com'), 'john@gmail.com');
});

test('non-gmail dots are preserved (only gmail ignores dots)', () => {
  // Outlook treats dots as significant, so we must NOT strip them there.
  assert.strictEqual(norm('first.last@outlook.com'), 'first.last@outlook.com');
});

test('case and surrounding whitespace are normalized', () => {
  assert.strictEqual(norm('  John@Gmail.com  '), 'john@gmail.com');
});

test('two disguised gmail variants of one account collide (abuse blocked)', () => {
  const a = norm('  Jo.hn+aug@gmail.com ');
  const b = norm('JOHN@gmail.com');
  assert.strictEqual(a, b);
});

test('genuinely different emails stay different (no false collision)', () => {
  assert.notStrictEqual(norm('john@gmail.com'), norm('john2@gmail.com'));
  assert.notStrictEqual(norm('john@gmail.com'), norm('john@outlook.com'));
});

test('malformed input without @ is returned lowercased, not crashed', () => {
  assert.strictEqual(norm('not-an-email'), 'not-an-email');
});
