import test from 'node:test';
import assert from 'node:assert';
import { generateAgencyCode } from '../lib/codes.js';

test('generateAgencyCode: default length is 8 characters', () => {
  assert.strictEqual(generateAgencyCode().length, 8);
});

test('generateAgencyCode: never contains ambiguous characters (0/O, 1/I)', () => {
  for (let i = 0; i < 200; i++) {
    const code = generateAgencyCode();
    assert.ok(!/[01OI]/.test(code), `Code "${code}" contained an ambiguous character`);
  }
});

test('generateAgencyCode: respects a custom length', () => {
  assert.strictEqual(generateAgencyCode(12).length, 12);
});
