import test from 'node:test';
import assert from 'node:assert';
import { passwordIssue } from '../lib/password.js';
import { verifyTotpCode } from '../lib/twoFactor.js';
import { generateSecret, generate } from 'otplib';

test('passwordIssue: rejects short passwords', () => {
  assert.ok(passwordIssue('short'));
  assert.ok(passwordIssue(''));
  assert.ok(passwordIssue(undefined));
});

test('passwordIssue: accepts a 10+ character password', () => {
  assert.strictEqual(passwordIssue('correcthorsebattery'), null);
});

test('verifyTotpCode: accepts a freshly generated valid code', async () => {
  const secret = await generateSecret();
  const code = await generate({ secret });
  assert.strictEqual(await verifyTotpCode(secret, code), true);
});

test('verifyTotpCode: rejects an incorrect code', async () => {
  const secret = await generateSecret();
  assert.strictEqual(await verifyTotpCode(secret, '000000'), false);
});

test('verifyTotpCode: returns false (not a crash) for missing secret or code', async () => {
  assert.strictEqual(await verifyTotpCode(null, '123456'), false);
  assert.strictEqual(await verifyTotpCode('somesecret', null), false);
});
