# Battle Room — Launch Prep Checklist

> **What this file is:** the single source of truth for what's done and what's
> left before Battle Room can take real, paying customers. It lives in the repo
> so it's permanent, version-controlled, and always here — check things off as
> you go. Written in plain English on purpose; no prior knowledge assumed.
>
> **For Claude (future sessions):** read this file first to re-orient on where
> the project stands. Update it whenever an item's status changes. Do **not**
> put secrets/keys in this file — it's committed to a public-ish repo.
>
> _Last updated: 2026-08-18_

---

## ⚠️ NON-NEGOTIABLE before taking real payments — DO NOT SKIP

**The card-upfront trial must be tested end-to-end in Stripe TEST mode before it
goes live. This is not optional and cannot be deferred past go-live.**

Why: this flow auto-charges customers' cards. The code was written but has NEVER
actually charged a card (Stripe was never testable during development). Shipping
untested payment code to real customers risks wrong charges, charging cancelled
users, silent non-charging (free product), and Stripe account freezes from
disputes.

The test is cheap (~15 min) and rides along with the Stripe setup you have to do
anyway — it is NOT extra work, just the correct order:
  1. Set up Prices + env vars + `NEXT_PUBLIC_CARD_TRIAL=1` in Stripe **TEST mode**.
  2. Do one fake signup with test card `4242 4242 4242 4242`.
  3. Use Stripe's **test clock** to fast-forward 14 days and CONFIRM the card is
     actually charged the right amount and the subscription converts.
  4. Only after that passes, flip Stripe to **LIVE mode** and repeat the setup
     with live Prices.

Test mode == live mode setup, so a clean test-mode run means live "just works."
Deferring the whole thing until launch is fine — but the test happens *with* the
Stripe setup as one sitting, never separated from it. (Claude can drive this and
verify each step against the database, same as the referral test that passed.)

---

## ✅ Already done (this is a lot — most first sites don't have half of it)

- **Payments** — Stripe checkout works (test mode). Subscriptions, plan tiers,
  and the referral-reward system are all wired up and were verified end-to-end
  with a real test-mode payment (money actually moved, credited once, no
  double-charge).
- **Database security** — Row Level Security is ON for all 18 tables with
  zero public policies. Translation: the key that ships to every visitor's
  browser can't read your data at all — only your server can. This is the #1
  thing people get wrong with this setup, and yours is right.
- **Accounts & access** — agency admin codes, manager codes, and creator PINs,
  all hashed (bcrypt). Sessions are hardened (httpOnly/Secure/SameSite cookies).
- **Cross-agency isolation** — one agency can never see or touch another's
  roster. Found and fixed two real bugs here; verified live.
- **Session safety** — changing/resetting a PIN kicks old logged-in devices;
  session priority handled correctly.
- **Rate limiting** — signup, login, and creating battles/creators/posts are
  all capped so a script can't flood you. Verified live (blocks at the limit).
- **Referral abuse protection** — a referral can only pay out once, even if
  someone cancels and re-subscribes or Stripe retries. Verified live.
- **Uploads** — avatar uploads are restricted to safe image types.
- **Error tracking** — Sentry is set up (you get alerted when something breaks).
- **Legal pages** — Terms of Service + Privacy Policy exist, written for Idaho
  law, entity-neutral (no company named yet — applies to whatever entity you
  form). NOTE: still needs a real attorney's review (see below).
- **Automated tests** — 37 tests, all passing. Catches regressions.
- **Bot protection (code)** — built to "fail open": if the bot-check provider
  is down, signups still work; when it recovers, protection turns on
  automatically. Keys are in place and armed. (See watch-list item below.)
- **Age verification (Idaho)** — signup now collects a date of birth and the
  server computes the real age and rejects anyone under 18 (not just a
  checkbox). 10 dedicated tests cover the edge cases (exactly 18, day before
  18, leap days, impossible dates). LIVE.
- **Terms acceptance fixed** — the old site-wide blocking popup (which covered
  the Terms while asking you to agree to them) is gone. Agreement now happens
  at signup with a real link to read the Terms first — the normal-website way.
  LIVE.
- **Card-upfront free-trial flow (BUILT, dormant)** — normal-SaaS trial: card
  required at signup, 14-day free trial, then Stripe auto-charges and converts
  to a paid MONTHLY plan. Fully built with Idaho §48-603G + FTC-compliant
  disclosure, affirmative-consent checkbox, auto-renewal Terms section, and a
  pre-charge reminder email. **It is switched OFF** (behind NEXT_PUBLIC_CARD_TRIAL)
  so the current no-card trial is unchanged until you deliberately enable it —
  see launch blocker #2. Trial-abuse copy also corrected (was the misleading
  "one trial per email", now "one free trial per agency").
- **Polish** — per-page browser titles, double-submit guards on signup/create/
  invite, and all 32 native alert()/confirm() popups replaced with clean
  in-page toasts/modals. Analytics confirmed live; favicon + SEO
  (robots.txt/sitemap/meta) confirmed already in place. GitHub repo description
  fixed. LIVE.
- **Housekeeping** — database schema file synced to reality; dependency
  security alert (nanoid) patched, 0 vulnerabilities; site fully de-branded
  (no old company name anywhere; the only TikTok mention is the outbound
  creator profile links, by design); pricing redesigned.

---

## 🔲 Before real / paying customers (the actual "launch blockers")

Roughly in the order that makes sense:

1. **Buy a real domain name** — ~$10–15/year.
   Right now you're at `battle-room.vercel.app`. A real business owns something
   like `battleroom.com`. This is first because it unlocks reliable email and
   makes you look legitimate. (Buy from Namecheap, Cloudflare, Google Domains,
   etc., then point it at Vercel — I can walk you through it.)

2. **Stripe setup + turn on the card-upfront trial** — free to set up; this is
   the one that costs you money if done wrong, so it has its own ordered
   sub-steps. The card-upfront trial CODE is already built and live but
   switched OFF; these steps configure Stripe and flip it on.

   Do these in order, all in Stripe TEST mode first:
   a. **Create the monthly Prices in Stripe** — one Product per plan with a
      monthly Price: Starter $39/mo, Growth $89/mo, Scale $179/mo. Each Price
      gets an ID like `price_1AbC...`.
   b. **Set the env vars in Vercel** — `STRIPE_PRICE_STARTER_MONTHLY`,
      `STRIPE_PRICE_GROWTH_MONTHLY`, `STRIPE_PRICE_SCALE_MONTHLY` = those IDs.
   c. **Set `NEXT_PUBLIC_CARD_TRIAL=1` in Vercel** — this is the switch that
      turns on the card-required disclosure + consent + Stripe checkout.
   d. **Test the whole flow end-to-end in test mode** — sign up, enter test
      card 4242 4242 4242 4242, confirm the trial starts, then use Stripe's
      test clock to fast-forward 14 days and confirm the card actually gets
      charged. (Claude can walk you through this and verify against the DB.)
   e. **Only then flip Stripe to LIVE mode** and repeat (a)/(b) with live
      Prices. Now real cards, real money.

   **Why it matters:** the site *shows* $39/$89/$179 but Stripe won't charge
   anything until real Price objects exist and are linked. And the trial won't
   require a card until the switch in (c) is on. Test mode is a safe sandbox —
   no real money — so test thoroughly before (e).

3. **Verify email sending (Resend)** — free tier is plenty to start.
   For password resets, receipts, trial reminders. It's set up but needs your
   real domain verified first — so this comes right after step 1.

4. **Upgrade to paid infrastructure** — needed before real traffic:
   - **Vercel Pro** — ~$20/month. Your own Terms of Service assume it.
   - **Supabase Pro** — ~$25/month. Raises the database connection limit and
     adds real backups. The free tier caps connections low (~60), which a
     real customer load would blow past.

5. **Attorney review of the legal wording** — one-time cost.
   Have a lawyer bless: the Terms of Service + Privacy Policy, AND the new
   auto-renewal / free-trial disclosure and consent wording on the signup
   page (built to Idaho §48-603G + FTC ROSCA). It's all a strong,
   professionally-structured draft written to be *reviewed*, not written from
   scratch — so it's a cheap edit, not a from-zero job.

---

## 🔲 Nice-to-have (do anytime; not blockers)

- **Analytics** — ✅ DONE (enabled in Vercel and collecting visits).
- **Favicon** — ✅ DONE (already in your browser tab).
- **After upgrading to Vercel Pro: enable the pre-battle reminder cron.** The
  `/api/cron/battle-reminders` endpoint is built and ready (push notifies both
  creators ~an hour before a confirmed battle). It is NOT scheduled yet because
  Hobby caps you at 2 cron jobs / once-a-day. Once on Pro, add this to the
  "crons" array in vercel.json:
  `{ "path": "/api/cron/battle-reminders", "schedule": "*/15 * * * *" }`
- **Auto-renewal compliance — partly handled, two items remain.** Done: a
  clear-and-conspicuous auto-renewal disclosure now sits under the pricing
  plans, the signup consent language is explicit, and cancellation is
  self-service online (all core ARL/ROSCA expectations). Still to do:
  (1) **Annual-plan renewal reminder** — New York (and similar states) require
  a reminder 15-45 days before an annual subscription auto-renews. This needs a
  scheduled job (like the battle-reminder cron, so it needs Vercel Pro) that
  finds yearly subscriptions nearing renewal and emails the contact. Build it
  before promoting the yearly plan heavily. (2) **Price-increase rule** — if you
  ever raise a subscriber's price, several states require either fresh
  affirmative consent or a 14-day penalty-free cancel window with a prorated
  refund; handle that when you first change prices.
  NOTE: most state auto-renewal laws (e.g. California's) apply to *consumers*,
  and Battle Room is B2B (agencies), which likely narrows what strictly applies
  — but complying anyway is cheap insurance. Confirm the specifics with your
  attorney.
- **Set your real business contact email (replaces the placeholder).** The
  Terms of Service and the Enterprise "contact sales" button now use a
  placeholder, `support@battle-room.app`, instead of a personal address.
  Before launch: (1) replace that placeholder with your real business email in
  the code (one spot in pages/tos.js, one in pages/index.js — tell Claude the
  address and it's a one-line change each), and (2) update the Vercel env vars
  for outbound email — the Resend "from" address and the billing-alert
  recipient (e.g. ADMIN_ALERT_EMAIL) — to that same business email. A
  role-based address on your own domain (support@ or legal@) is best.
- **Light stress test now / real one later** — a small burst test now is fine
  to confirm signups don't exhaust the free-tier DB connections. The *real*
  load test belongs AFTER you're on Vercel Pro + Supabase Pro, so you're
  testing the setup you'll actually run.

---

## 🔲 Explicitly NOT needed yet (don't waste time here)

- **SEO** (search-engine optimization) — matters much later, if ever.
- **Cookie consent banner** — only needed if you target EU users.
- **Blog / content marketing** — not now.
- **Social media integration** — not now.
- **Native mobile app** — the site already works on phones; skip this.

---

## 👀 Watch list (open items, mostly out of your hands)

- **Cloudflare Turnstile 503** — the bot-check provider is having an outage,
  so the widget doesn't show right now. Thanks to the fail-open fix, signups
  work fine and protection will switch on automatically when Cloudflare
  recovers. Nothing to do but wait; re-check occasionally.
- **Stripe test customers** — ✅ cleaned up (deleted from the test dashboard).
- **GitHub repo description** — ✅ fixed (no longer says "tiktok agency").

---

## 💰 Rough monthly cost once fully launched

- Vercel Pro: ~$20 · Supabase Pro: ~$25 · Domain: ~$1 (billed yearly) ·
  Email (Resend): free to start · Stripe: no monthly fee (takes a % per sale).
- **~$45–50/month to run**, plus a one-time attorney fee for the legal review.
  (Earlier I estimated higher assuming heavier usage; at your starting scale
  this is the realistic number.)
