# Email Setup — Battle Room Clash (finish the "email" launch item)

Follow top to bottom. Every value you need is written out exactly. This turns
on ALL email at once: feedback alerts, password/admin-code resets, billing
codes, trial reminders, and payment-failure notices.

Estimated time: ~20 minutes, most of it waiting for DNS.

---

## Step 1 — Create a Resend account
1. Go to **resend.com** → **Sign up** (use `battleroomadmin@gmail.com`).
2. Free tier is 3,000 emails/month, no card required.

## Step 2 — Add and verify your domain
1. In Resend: **Domains** (left menu) → **Add Domain**.
2. Enter: `battleroomclash.com`
3. Resend shows you **DNS records** to add (usually 3: an MX record and two TXT
   records — one for SPF, one for DKIM). Leave that Resend page open.

## Step 3 — Add those DNS records at Namecheap
1. **namecheap.com** → Domain List → **Manage** next to `battleroomclash.com`
   → **Advanced DNS** tab (same place you added the Vercel records).
2. For **each** record Resend gave you, click **+ ADD NEW RECORD** and copy it
   in exactly:
   - **Type**: match what Resend says (TXT Record, or MX Record)
   - **Host**: copy from Resend (often `@`, `send`, or `resend._domainkey`)
   - **Value**: copy from Resend (long strings — use their copy button)
   - **TTL**: Automatic
   - For an **MX record**, Namecheap also asks for a **Priority** — use what
     Resend shows (usually `10`).
3. **IMPORTANT:** do NOT touch or delete the two Vercel records already there
   (the A record `@ → 216.198.79.1` and the CNAME `www → ...vercel-dns...`).
   You're only ADDING the Resend ones.
4. Save.

## Step 4 — Verify in Resend
1. Back on the Resend Domains page, click **Verify** (or wait — it auto-checks).
2. It flips to **Verified** once DNS propagates (minutes up to a couple hours).
   You can continue to Step 5 while you wait, but email won't send until this
   shows Verified.

## Step 5 — Create an API key
1. Resend → **API Keys** → **Create API Key**.
2. Name it anything (e.g. "Battle Room Clash Production"). Permission: **Full
   access** (or "Sending access" is fine).
3. **Copy the key** (starts with `re_`). You only see it once.

## Step 6 — Set the environment variables in Vercel
Vercel → your **battle-room** project → **Settings → Environment Variables**.
Add these two (Production checked; all environments is fine):

| Key | Value |
|-----|-------|
| `RESEND_API_KEY` | `re_...` (the key you just copied) |
| `RESEND_FROM_EMAIL` | `Battle Room Clash <noreply@battleroomclash.com>` |

`ADMIN_ALERT_EMAIL` is already set to `battleroomadmin@gmail.com` — leave it.

**Copy `RESEND_FROM_EMAIL` exactly, including the angle brackets:**
```
Battle Room Clash <noreply@battleroomclash.com>
```
(`noreply@battleroomclash.com` does not need to be a real inbox — Resend just
sends *from* it. Replies would bounce, which is fine for automated mail. If you
want replies to reach you, use `battleroomadmin@gmail.com` inside the brackets
instead — but only after the domain is verified.)

## Step 7 — Redeploy
Env vars only take effect on a new deploy:
- Vercel → **Deployments** → latest → **⋯** menu → **Redeploy**.

## Step 8 — Test it (this confirms the whole chain works)
1. Go to `battleroomclash.com/admin` → **"Forgot your admin code?"**
2. Enter a real agency code + the exact contact email on file for it → submit.
3. Check that inbox (and spam on the first try). If the reset email arrives,
   **email is fully working** — feedback alerts and everything else now send too.

---

## If something doesn't work

- **No email at all + you saw an error** → `RESEND_API_KEY` isn't set right in
  Vercel, or you didn't redeploy after adding it.
- **Domain won't verify** → a DNS record is off. Re-check each Resend record
  against Namecheap, character for character. DNS can take up to a few hours.
- **Emails only reach your own address, not others** → domain isn't verified yet
  (Step 4). Until it is, Resend only delivers to your Resend signup email.
- **Emails land in spam** → normal on a brand-new domain; improves over time.
  Verifying the domain (SPF + DKIM) is what keeps you out of spam, so don't skip
  Step 2–4.

## The absolute minimum you have to do (only you can)
1. Sign up at resend.com + copy one API key.
2. Paste the Resend DNS records into Namecheap (don't touch the Vercel ones).
3. Paste two values into Vercel + redeploy.

Everything else (the code) is already built and correct.
