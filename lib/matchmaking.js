import { LEAGUE_OPTIONS } from './constants.js';

// Best Match scoring for finding a fair opponent. LOWER is a better match.
// Factors, in rough order of weight:
//   - diamondDiff: absolute gap in 30-day diamonds (the primary fairness signal)
//   - tzPenalty:   flat cost for a different timezone (harder to schedule live)
//   - leaguePenalty: distance apart on the league ladder (A1…D5), 2000 per rung,
//                    applied only when BOTH creators have a league set so nobody
//                    is penalised for leaving it blank
//   - favoriteBonus: a large negative so starred creators float to the top
//
// The weights are deliberately simple and tunable; diamonds dominate, with
// league and timezone as meaningful tie-breakers.
export const LEAGUE_STEP_PENALTY = 2000;
export const TZ_PENALTY = 5000;
export const FAVORITE_BONUS = -1000000;

export function matchScore(me, other, { isFavorite = false } = {}) {
  const diamondDiff = Math.abs((other.diamonds || 0) - (me.diamonds || 0));
  const tzPenalty = other.tz === me.tz ? 0 : TZ_PENALTY;

  const myIdx = LEAGUE_OPTIONS.indexOf(me.league);
  const theirIdx = LEAGUE_OPTIONS.indexOf(other.league);
  const leaguePenalty = (myIdx >= 0 && theirIdx >= 0)
    ? Math.abs(myIdx - theirIdx) * LEAGUE_STEP_PENALTY
    : 0;

  const favoriteBonus = isFavorite ? FAVORITE_BONUS : 0;

  return diamondDiff + tzPenalty + leaguePenalty + favoriteBonus;
}
