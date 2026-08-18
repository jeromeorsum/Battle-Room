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
> _Last updated: 2026-08-17_

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
- **Automated tests** — 27 tests, all passing. Catches regressions.
- **Bot protection (code)** — built to "fail open": if the bot-check provider
  is down, signups still work; when it recovers, protection turns on
  automatically. Keys are in place and armed. (See watch-list item below.)
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

2. **Switch Stripe to live mode + fix the prices** — free to switch; this is
   the one that costs you money if missed.
   Two parts: (a) flip Stripe from test mode to live mode, and (b) create new
   Stripe "Price" objects that match the current displayed pricing
   ($39 / $89 / $179 monthly) and update the `STRIPE_PRICE_*` settings.
   **Why it matters:** the website *shows* the new prices, but Stripe would
   still *charge the old amounts* until this is done. Must happen before you
   take a single real payment.

3. **Verify email sending (Resend)** — free tier is plenty to start.
   For password resets, receipts, trial reminders. It's set up but needs your
   real domain verified first — so this comes right after step 1.

4. **Upgrade to paid infrastructure** — needed before real traffic:
   - **Vercel Pro** — ~$20/month. Your own Terms of Service assume it.
   - **Supabase Pro** — ~$25/month. Raises the database connection limit and
     adds real backups. The free tier caps connections low (~60), which a
     real customer load would blow past.

5. **Attorney review of Terms of Service + Privacy Policy** — one-time cost.
   What you have is a strong, professionally-structured draft — but a real
   lawyer should mark it up before you rely on it. It'll be a cheap review
   because they're editing a solid document, not starting from scratch.

---

## 🔲 Nice-to-have (do anytime; not blockers)

- **Analytics** — one click to enable in Vercel, free. Shows how many people
  visit, where they come from, where they drop off.
- **Favicon** — the tiny icon in the browser tab. Pure polish.
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
- **Two orphan Stripe test customers** — harmless leftovers in test mode; can
  be deleted from the Stripe test dashboard for tidiness.
- **GitHub repo *description*** — still reads "a tiktok agency battle room…".
  That's GitHub metadata, not the website. Cosmetic; clear it anytime.

---

## 💰 Rough monthly cost once fully launched

- Vercel Pro: ~$20 · Supabase Pro: ~$25 · Domain: ~$1 (billed yearly) ·
  Email (Resend): free to start · Stripe: no monthly fee (takes a % per sale).
- **~$45–50/month to run**, plus a one-time attorney fee for the legal review.
  (Earlier I estimated higher assuming heavier usage; at your starting scale
  this is the realistic number.)
