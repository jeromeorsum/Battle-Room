import test from 'node:test';
import assert from 'node:assert';
import { canWrite, isLockedOut } from '../lib/agencyStatus.js';

test('canWrite: active agencies can always write', () => {
  assert.strictEqual(canWrite('active'), true);
});

test('canWrite: trialing with no expiry set (legacy) can write', () => {
  assert.strictEqual(canWrite('trialing', null), true);
});

test('canWrite: trialing with a future expiry can write', () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(canWrite('trialing', future), true);
});

test('canWrite: trialing with a past expiry cannot write', () => {
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(canWrite('trialing', past), false);
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
