import test from 'node:test';
import assert from 'node:assert';
import { TRIAL_DAYS, TRIAL_REMINDER_DAYS_BEFORE, trialDisclosureLine } from '../lib/trialTerms.js';

test('trial is 14 days', () => {
  assert.strictEqual(TRIAL_DAYS, 14);
});

test('reminder fires inside the FTC 1-7 day pre-charge window', () => {
  assert.ok(TRIAL_REMINDER_DAYS_BEFORE >= 1 && TRIAL_REMINDER_DAYS_BEFORE <= 7);
});

test('disclosure line names the price, the recurrence, and cancellation', () => {
  const line = trialDisclosureLine({ price: 89, period: 'month' });
  assert.match(line, /\$89/);
  assert.match(line, /month/);
  assert.match(line, /14-day/);
  assert.match(line, /cancel/i);
});

test('disclosure includes the exact first-charge date when given', () => {
  const line = trialDisclosureLine({ price: 39, firstChargeDate: 'September 2, 2026' });
  assert.match(line, /September 2, 2026/);
});

test('disclosure falls back gracefully when price is missing', () => {
  const line = trialDisclosureLine({});
  assert.match(line, /plan price/);
  assert.match(line, /14/);
});

test('yearly period is reflected in the wording', () => {
  const line = trialDisclosureLine({ price: 890, period: 'year' });
  assert.match(line, /year/);
});
