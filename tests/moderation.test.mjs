import test from 'node:test';
import assert from 'node:assert';
import { containsBlockedContent } from '../lib/moderation.js';

test('containsBlockedContent: catches an obvious blocked word', () => {
  assert.strictEqual(containsBlockedContent('this message has shit in it'), true);
});

test('containsBlockedContent: is case-insensitive', () => {
  assert.strictEqual(containsBlockedContent('SHIT'), true);
});

test('containsBlockedContent: normal messages pass through', () => {
  assert.strictEqual(containsBlockedContent('Looking for a chill battle tonight at 8pm ET'), false);
});
