# Battle Room — Multi-Tenant Setup Guide

This version supports multiple agencies on one platform, fully isolated from
each other, plus a super admin view across all of them and a public pricing
page. It's been test-built (`npm run build` passes clean) — you fill in
accounts, keys, and click deploy.

---

## How access works now

| Who | Where | Gets in with |
|---|---|---|
| A creator | `/app` | Their agency's **agency code**, then their own name + personal PIN |
| An agency admin (you, or an agency manager) | `/admin` | That agency's **agency code** + that agency's **admin code** |
| You, platform-wide | `/super-admin` | The **SUPER_ADMIN_CODE** you set as an environment variable — nobody else has this |
| Anyone | `/` | Public landing page with pricing — no login |
| A new agency | `/signup` | Fills a form, picks a plan, chooses their own admin code, gets an agency code back |

Every creator and battle row in the database is tagged with an `agency_id`.
All API routes filter by it, and the battle-booking route double-checks both
creators actually belong to the claimed agency before letting a battle be
created — that's what keeps agencies from ever seeing each other's rosters.

---

## Step 1 — Supabase

Same as before: create a project at supabase.com, open **SQL Editor**, paste
in `supabase/schema.sql`, run it. This version's schema adds an `agencies`
table and an `agency_id` column on `creators` and `battles`.

Grab your **Project URL**, **anon public key**, and **service_role key** from
**Project Settings → API**.

## Step 2 — Push notification keys

```bash
npx web-push generate-vapid-keys
```
Same as before — save both keys.

## Step 3 — Environment variables

Good news: `.env.local` in this project already has real values filled in for
you —

- ✅ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` — real, working push keys, already generated
- ✅ `SUPER_ADMIN_CODE` — set to the code you chose

Still need filling in (these require your own Supabase account, see Step 1):
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Once you've created your Supabase project in Step 1, just paste those three
values into `.env.local`, replacing the placeholder text — everything else is
already done.

**Keep `.env.local` private** — don't post it, don't email it, don't paste it
into chat anywhere. It's already excluded from git via `.gitignore` so it
won't accidentally get pushed to GitHub in Step 5.

## Step 4 — Test locally

```bash
npm install
npm run dev
```

Try the flow in order:
1. Go to `/signup`, create a test agency, note the agency code it gives you.
2. Go to `/app`, enter that agency code, create a creator profile.
3. Go to `/admin`, log in with the agency code + the admin code you chose at signup.
4. Go to `/super-admin`, log in with your `SUPER_ADMIN_CODE`, confirm you can see the test agency and change its plan/status.

## Step 5 — Push to GitHub, deploy to Vercel

Same as the single-tenant version:
```bash
git init && git add . && git commit -m "Multi-tenant Battle Room"
git remote add origin https://github.com/YOUR-USERNAME/battle-room-web.git
git branch -M main && git push -u origin main
```
Then import the repo on vercel.com, paste in every value from `.env.local`
(including `SUPER_ADMIN_CODE`) under **Environment Variables**, and deploy.

## Step 6 — Connect a domain, test push end-to-end

Same as before — see the archived single-tenant instructions if you need the
detailed DNS steps. Push notifications need real HTTPS, which Vercel gives you
automatically once deployed.

---

## Editing pricing

All pricing lives in `lib/pricing.js` — four tiers, each with a creator cap,
a monthly price, and a yearly price. Change the numbers any time; the landing
page and signup page both read from this one file, so there's nothing else to
update.

---

## What's NOT wired up yet: real payment collection

Signing up right now creates an agency in `trialing` status — **no money
changes hands**. To actually charge agencies, the next real step is:

1. Add Stripe: create products/prices matching your tiers in the Stripe
   dashboard (or via their API).
2. On `/signup`, instead of calling `/api/agencies` directly, create a Stripe
   Checkout session and redirect there; only create the agency row after
   Stripe confirms payment (via a webhook).
3. Add a Stripe webhook handler (`/api/webhooks/stripe`) that updates an
   agency's `status` to `active`/`past_due`/`canceled` based on subscription
   events, and `plan_tier` if they upgrade/downgrade.
4. The super admin panel already has the fields (`stripe_customer_id`,
   `stripe_subscription_id`) reserved in the schema for this — they're just
   not populated yet.

This is a genuinely separate chunk of work (Stripe's docs are good, but it's
not a five-minute add), and worth doing carefully rather than rushed — happy
to help scope it out further, ideally in a more hands-on tool like Claude Code
given how much of the codebase it touches.

---

## Security — what changed in this pass

This pass fixed real gaps and added real protections, not just cosmetic ones:

**Fixed vulnerabilities:**
- Previously, anyone who knew a creator's database ID could edit or delete
  their profile with **no PIN check at all**. Fixed — now requires proof
  you're either that creator or an admin of their agency.
- Previously, accepting/declining a battle trusted whatever `actorId` the
  client sent — anyone could accept/decline on someone else's behalf.
  Fixed — identity now comes from a verified session, never the request body.
- Previously, the super admin code was sent as a plain header on every
  request. Fixed — now a proper login endpoint issues a short-lived (2 hour)
  session cookie instead.

**Added:**
- **httpOnly, Secure, SameSite=Strict session cookies** for every role
  (creator, agency admin, super admin) — JavaScript can't read them (blocks
  XSS token theft), they're never sent over plain HTTP, and the browser won't
  attach them to cross-site requests (blocks CSRF without needing separate
  CSRF tokens).
- **Rate limiting / lockout** on every login endpoint (creator PIN, agency
  admin code, agency-code lookup, super admin code) — 5 failed attempts locks
  that identifier out for 15 minutes, so brute-forcing a PIN isn't practical.
- **Security headers** on every response: HSTS (forces HTTPS), a Content
  Security Policy, X-Frame-Options (blocks clickjacking), and more — see
  `next.config.js`.
- **Minimum length enforcement**: creator PINs need 6+ characters, agency
  admin codes need 8+ characters (both checked server-side, not just in the UI).
- **bcrypt cost factor 12** (up from 10) for all hashed secrets.
- Nothing sensitive lives in `localStorage` anymore — the frontend asks the
  server "am I logged in?" via cookie-backed session-check endpoints instead
  of trusting anything cached client-side.

**What this doesn't cover, and honestly can't from code alone:**
- **Supabase/Vercel account security is on you** — use a strong, unique
  password and enable 2FA on both accounts. If those get compromised, none
  of the above matters.
- **This hasn't been penetration-tested** by a third party. "Extremely
  secure" code review from an AI is a strong baseline, not a guarantee — for
  something handling real payment data or a large number of agencies, a
  professional security audit before launch is a reasonable investment, not
  overkill.
- **Dependency vulnerabilities**: run `npm audit` periodically and keep
  dependencies updated — a secure app today can develop known vulnerabilities
  in its dependencies over time.
- **Physical/social security**: the strongest code can't stop someone writing
  their admin code on a sticky note. Worth a quick word to your agency admins
  about not sharing codes over insecure channels (plain text messages, etc).

---

## Legal reminder

Before opening this to other agencies for real: get a Terms of Service and
Privacy Policy in place, and talk to a lawyer about data-privacy obligations
if any rosters include creators under 18 — this is genuinely worth getting
right before you have other people's data in your database, not an
afterthought.

---

## Pricing this hosting costs you (as the platform owner)

Unchanged from the single-tenant version — Supabase (~$25/mo Pro), Vercel
(~$20/mo Pro for commercial use), a domain (~$10–15/yr). Multi-tenancy adds
no extra infrastructure cost by itself; it's the same database and hosting,
just organized differently.
