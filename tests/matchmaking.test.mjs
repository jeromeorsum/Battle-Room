import test from 'node:test';
import assert from 'node:assert';
import { matchScore, TZ_PENALTY, LEAGUE_STEP_PENALTY, FAVORITE_BONUS } from '../lib/matchmaking.js';

const base = { diamonds: 10000, tz: 'ET', league: 'B3' };

test('identical creators score 0 (perfect match)', () => {
  assert.strictEqual(matchScore(base, { ...base }), 0);
});

test('diamond gap raises the score by the difference', () => {
  assert.strictEqual(matchScore(base, { ...base, diamonds: 15000 }), 5000);
});

test('different timezone adds the tz penalty', () => {
  assert.strictEqual(matchScore(base, { ...base, tz: 'PT' }), TZ_PENALTY);
});

test('same league adds no league penalty', () => {
  assert.strictEqual(matchScore(base, { ...base, league: 'B3' }), 0);
});

test('one league rung apart adds one step penalty', () => {
  // B3 -> B4 is one rung on the A1..D5 ladder
  assert.strictEqual(matchScore(base, { ...base, league: 'B4' }), LEAGUE_STEP_PENALTY);
});

test('several league rungs apart scales with distance', () => {
  // B3 -> D3 spans multiple rungs; penalty is a positive multiple of the step
  const score = matchScore(base, { ...base, league: 'D3' });
  assert.ok(score > LEAGUE_STEP_PENALTY);
  assert.strictEqual(score % LEAGUE_STEP_PENALTY, 0);
});

test('a blank league on either side is not penalised', () => {
  assert.strictEqual(matchScore(base, { ...base, league: '' }), 0);
  assert.strictEqual(matchScore({ ...base, league: '' }, { ...base, league: 'D5' }), 0);
});

test('favorites float to the top with a large negative score', () => {
  const normal = matchScore(base, { ...base, diamonds: 50000 });
  const fav = matchScore(base, { ...base, diamonds: 50000 }, { isFavorite: true });
  assert.ok(fav < normal);
  assert.ok(fav <= FAVORITE_BONUS + 100000); // dominated by the favorite bonus
});

test('a closer-league opponent can outrank a farther-league one', () => {
  const close = matchScore(base, { diamonds: 12000, tz: 'ET', league: 'B4' }); // 2000 diamond + 2000 league
  const far = matchScore(base, { diamonds: 10000, tz: 'ET', league: 'D5' });   // 0 diamond + many league rungs
  assert.ok(close < far);
});

test('missing diamonds are treated as 0, not a crash', () => {
  assert.strictEqual(matchScore({ tz: 'ET', league: 'B3' }, { tz: 'ET', league: 'B3' }), 0);
});
