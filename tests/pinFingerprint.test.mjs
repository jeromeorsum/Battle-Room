import test from 'node:test';
import assert from 'node:assert';
import { pinFingerprint } from '../lib/session.js';

// pinFingerprint stamps a short hash of the PIN hash into a creator's session.
// When the PIN changes, its hash changes, so the fingerprint changes, so old
// sessions (carrying the old fingerprint) no longer match and get rejected.
// These tests lock in that security contract.

test('same PIN hash always yields the same fingerprint (deterministic)', () => {
  const h = '$2b$10$abcdefghijklmnopqrstuv';
  assert.strictEqual(pinFingerprint(h), pinFingerprint(h));
});

test('a different PIN hash yields a different fingerprint (change invalidates sessions)', () => {
  const before = pinFingerprint('$2b$10$oldoldoldoldoldoldold');
  const after = pinFingerprint('$2b$10$newnewnewnewnewnewnew');
  assert.notStrictEqual(before, after);
});

test('empty / missing hash returns empty string, never throws', () => {
  assert.strictEqual(pinFingerprint(''), '');
  assert.strictEqual(pinFingerprint(null), '');
  assert.strictEqual(pinFingerprint(undefined), '');
});

test('fingerprint is a fixed 16-char hex slice (stable format)', () => {
  const fp = pinFingerprint('$2b$10$somethingsomethingsomething');
  assert.strictEqual(fp.length, 16);
  assert.match(fp, /^[0-9a-f]{16}$/);
});

test('does not leak the original hash', () => {
  const h = '$2b$10$secretsecretsecretsecret';
  assert.ok(!pinFingerprint(h).includes('secret'));
});
