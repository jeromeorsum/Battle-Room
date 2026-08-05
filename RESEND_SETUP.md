# Connecting Email (for admin "forgot code" recovery)

Same pattern as Stripe — the code's already built, you just need an account.

## 1. Create a Resend account
resend.com → sign up (free tier: 3,000 emails/month, no card required).

## 2. Get an API key
Dashboard → API Keys → Create API Key. Copy it.

## 3. Set your environment variables
```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=Battle Room <onboarding@resend.dev>
```
The `onboarding@resend.dev` address works immediately with no setup — good
for testing. For a real "from" address at your own domain (e.g.
`noreply@yourdomain.com`), you'll need to verify that domain in Resend's
dashboard first (Domains → Add Domain → add the DNS records they give you).

## 4. Test it
On `/admin`, click "Forgot your admin code?", enter a real agency code and
the exact contact email on file for that agency, submit. Check that inbox
for the reset link (also check spam on first test).

## How it works
- The reset link contains a random token, never the email address or admin
  code itself.
- The token is stored **hashed** in the `password_resets` table, expires in
  30 minutes, and can only be used once.
- The "forgot code" endpoint always returns the same generic message
  whether or not the agency code/email actually matched — this stops
  someone from using it to fish for which emails are registered to which
  agencies.
