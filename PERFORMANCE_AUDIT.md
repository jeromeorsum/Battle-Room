# Battle Room — Performance & Scale Audit
_Reviewed database query patterns, indexing, N+1 risks, and client bundle._

## Bottom line

The app is **architecturally sound for scale**, and I fixed the one thing that
genuinely mattered: **missing database indexes**. Everything else checked out.

---

## The big fix (applied to production) — database indexes

**The problem:** Postgres does not automatically index foreign keys, and *every*
list query in this app filters by `agency_id` (rosters, battles, posts, team,
audit log — 23 such filters across the API). With no index, each of those was a
**full table scan**. Invisible at 15 test agencies; at 10,000 creators, every
roster load would scan all 10,000 rows and get linearly slower.

**The fix:** I added 8 targeted indexes to the live database (and to
`schema.sql`), designed from the actual query patterns:

| Index | Serves |
|---|---|
| `creators(agency_id, created_at)` | roster list (filter + sort in one) |
| `battles(agency_id, datetime_utc)` | battle schedule list |
| `battles(datetime_utc)` | the reminder cron's global time-range scan |
| `posts(agency_id, created_at)` | posts feed |
| `agency_users(agency_id)` | team list |
| `audit_logs(agency_id, created_at)` | audit history |
| `agencies(stripe_subscription_id)` | Stripe webhook + reconcile lookups |
| `agencies(referral_code)` | referral credit lookups |

Composite `(agency_id, sort_column)` indexes serve both the filter and the sort
in a single index, and also cover plain `agency_id` lookups (leftmost column).
These turn full scans into fast index seeks and keep query time roughly flat as
data grows. **Verified applied to the live database.**

> Note: at your current tiny data size, Postgres's planner may still choose a
> sequential scan (it's faster on tiny tables) — that's expected and fine. The
> indexes automatically start being used as tables grow, which is exactly when
> you need them. No action required.

---

## What I checked and found HEALTHY

### No N+1 query patterns in hot paths
The loops that exist are safe:
- The Stripe reconcile cron fetches all subscriptions and all agencies **once
  each**, then compares them in memory — not a per-row query.
- The login and password-reset loops run in-memory bcrypt comparisons over rows
  already fetched in one query.
- The super-admin "recent signups" view counts IPs in memory, no per-agency query.
- The cron loops that send one email/notification per recipient are inherent
  (each person needs their own) and run in the background, off the user's path.

### Server code stays on the server
Verified that **bcrypt, JSON Web Tokens, the Stripe SDK, and the Supabase admin
client are NOT in the browser bundle** — Next.js correctly tree-shakes them out.
Your server logic and secrets never ship to the client.

### Bundle size is reasonable
~1.4 MB of client JS total across all pages (users download only a subset per
page), and **every page is statically prerendered** (fast to serve). The single
largest piece (~320 KB) is the **Sentry error-tracking SDK**.

---

## Optional future optimization (not done — a judgment call for you)

**Sentry is ~320 KB of your client bundle.** That's a real chunk, but error
tracking is genuinely valuable — especially right after launch when you want to
see real users' bugs. My recommendation: **keep it for now.** It's a one-time
cached download on static pages, and the visibility is worth it early on. If you
later want to trim it, the options are lazy-loading Sentry after the page is
interactive, or disabling unused Sentry integrations — but I'd not touch it
pre-launch, since a misconfiguration would silently lose your error reporting.

---

## Honest limits

- I can't run a real load test (thousands of concurrent users) in this
  environment — that's a job for a load-testing tool once you're closer to
  scale.
- "The query planner will use these indexes as you grow" is the correct, normal
  behavior, but the real proof is watching query times in Supabase's dashboard
  once you have meaningful data. Worth a glance after your first busy month.

_66/66 tests pass; build clean; 8 indexes verified live._
