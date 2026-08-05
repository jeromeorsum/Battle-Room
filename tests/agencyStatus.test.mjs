import test from 'node:test';
import assert from 'node:assert';
import { canWrite, isLockedOut } from '../lib/agencyStatus.js';

test('canWrite: trialing and active agencies can write', () => {
  assert.strictEqual(canWrite('trialing'), true);
  assert.strictEqual(canWrite('active'), true);
});

test('canWrite: past_due and canceled agencies cannot write', () => {
  assert.strictEqual(canWrite('past_due'), false);
  assert.strictEqual(canWrite('canceled'), false);
});

test('canWrite: unknown/undefined status defaults to no write access (fails safe)', () => {
  assert.strictEqual(canWrite(undefined), false);
  assert.strictEqual(canWrite('some_unexpected_value'), false);
});

test('isLockedOut: only canceled triggers a full lockout, not past_due', () => {
  assert.strictEqual(isLockedOut('canceled'), true);
  assert.strictEqual(isLockedOut('past_due'), false);
  assert.strictEqual(isLockedOut('active'), false);
  assert.strictEqual(isLockedOut('trialing'), false);
});
