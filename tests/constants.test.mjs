import test from 'node:test';
import assert from 'node:assert';
import { zonedTimeToUtc, zoneByCode, LEAGUE_OPTIONS } from '../lib/constants.js';

test('zonedTimeToUtc: 7pm Eastern in summer converts to 23:00 UTC (EDT, UTC-4)', () => {
  const result = zonedTimeToUtc('2026-08-07T19:00', 'America/New_York');
  assert.strictEqual(result.toISOString(), '2026-08-07T23:00:00.000Z');
});

test('zonedTimeToUtc: 7pm Eastern in winter converts to 00:00 UTC next day (EST, UTC-5)', () => {
  const result = zonedTimeToUtc('2026-01-07T19:00', 'America/New_York');
  assert.strictEqual(result.toISOString(), '2026-01-08T00:00:00.000Z');
});

test('zoneByCode: unknown code falls back to ET instead of crashing', () => {
  const zone = zoneByCode('NOT_A_REAL_CODE');
  assert.strictEqual(zone.code, 'ET');
});

test('zoneByCode: known code returns the right IANA zone', () => {
  const zone = zoneByCode('PT');
  assert.strictEqual(zone.iana, 'America/Los_Angeles');
});

test('LEAGUE_OPTIONS: generates exactly A1-D5 (20 options)', () => {
  assert.strictEqual(LEAGUE_OPTIONS.length, 20);
  assert.ok(LEAGUE_OPTIONS.includes('A1'));
  assert.ok(LEAGUE_OPTIONS.includes('D5'));
  assert.ok(!LEAGUE_OPTIONS.includes('E1'));
});
