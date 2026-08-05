# Connecting Stripe (do this when you're ready to charge real agencies)

The code for this is already built and waiting — nothing charges anyone
until you complete these steps. Until then, signup just starts a free trial,
same as before.

## 1. Create a Stripe account
stripe.com → sign up. Use **test mode** (toggle in the dashboard) while
you're setting this up — no real cards get charged in test mode.

## 2. Create your Products & Prices
In the Stripe Dashboard → **Product catalog** → **Add product**, create one
product per tier (Starter, Growth, Scale), and on each one add **two
recurring Prices** — one monthly, one yearly — matching the numbers in
`lib/pricing.js`.

For each Price, click into it and copy its **Price ID** (starts with
`price_`). You'll get 6 total (3 tiers × 2 billing periods).

## 3. Fill in your environment variables
Paste your 6 Price IDs into `.env.local` (and later, Vercel) matching these
exact names:
```
STRIPE_PRICE_STARTER_MONTHLY=price_xxxxx
STRIPE_PRICE_STARTER_YEARLY=price_xxxxx
STRIPE_PRICE_GROWTH_MONTHLY=price_xxxxx
STRIPE_PRICE_GROWTH_YEARLY=price_xxxxx
STRIPE_PRICE_SCALE_MONTHLY=price_xxxxx
STRIPE_PRICE_SCALE_YEARLY=price_xxxxx
```

Also grab your **Secret key** from Dashboard → **Developers → API keys**
(starts with `sk_test_` in test mode) and set:
```
STRIPE_SECRET_KEY=sk_test_xxxxx
```

## 4. Set up the webhook (this is what makes cutoff automatic)
1. Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://YOUR-DOMAIN/api/webhooks/stripe`
3. Select these events: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`
4. After creating it, click into the endpoint and copy the **Signing
   secret** (starts with `whsec_`), set:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

This webhook is what automatically sets an agency's status to `active`,
`past_due`, or `canceled` based on real payment events — including when an
agency cancels through their own Stripe billing portal. No manual button
needed; that's the whole point of wiring this up.

## 5. Enable the Billing Portal
Dashboard → **Settings → Billing → Customer portal** → turn it on. This is
what powers the "Manage Subscription" button in `/admin` — lets agencies
cancel or update their own payment method without you doing it manually.

## 6. Test it
In test mode, use Stripe's test card `4242 4242 4242 4242`, any future
expiry, any CVC. Subscribe from `/admin`, confirm status flips to `active`,
then cancel via "Manage Subscription" and confirm it flips to `canceled`
and locks the agency out (per the automated enforcement already built in).

## 7. Go live
Toggle Stripe out of test mode, repeat steps 2-4 for live Prices/webhook
(test and live mode have separate everything), swap your env vars to the
live keys, redeploy.
