import test from 'node:test';
import assert from 'node:assert';
import { ageFromDOB, isAdultDOB, MIN_AGE } from '../lib/age.js';

function isoYearsAgo(years, extraDays = 0) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  if (extraDays) d.setUTCDate(d.getUTCDate() + extraDays);
  return d.toISOString().split('T')[0];
}

test('exactly 18 today counts as adult', () => {
  assert.strictEqual(isAdultDOB(isoYearsAgo(18)), true);
});

test('one day short of 18 is NOT an adult', () => {
  // born 18 years ago but +1 day => birthday is tomorrow => still 17
  assert.strictEqual(isAdultDOB(isoYearsAgo(18, 1)), false);
});

test('clearly adult (30) passes', () => {
  assert.strictEqual(isAdultDOB(isoYearsAgo(30)), true);
});

test('clearly minor (10) fails', () => {
  assert.strictEqual(isAdultDOB(isoYearsAgo(10)), false);
});

test('MIN_AGE is 18', () => {
  assert.strictEqual(MIN_AGE, 18);
});

test('future date returns null / not adult', () => {
  const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  assert.strictEqual(ageFromDOB(future), null);
  assert.strictEqual(isAdultDOB(future), false);
});

test('malformed input returns null', () => {
  assert.strictEqual(ageFromDOB(''), null);
  assert.strictEqual(ageFromDOB(null), null);
  assert.strictEqual(ageFromDOB('not-a-date'), null);
  assert.strictEqual(ageFromDOB('2000/01/01'), null);
});

test('impossible calendar date returns null', () => {
  assert.strictEqual(ageFromDOB('2000-02-31'), null);
  assert.strictEqual(ageFromDOB('2000-13-01'), null);
});

test('absurdly old (year 1300) returns null', () => {
  assert.strictEqual(ageFromDOB('1300-01-01'), null);
});

test('leap-day birthday computes a real age', () => {
  const age = ageFromDOB('2000-02-29');
  assert.ok(typeof age === 'number' && age >= 24 && age <= 30);
});
