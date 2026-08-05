import test from 'node:test';
import assert from 'node:assert';
import { PRICING_TIERS, tierById } from '../lib/pricing.js';
import { priceIdFor } from '../lib/priceMap.js';

test('PRICING_TIERS: every paid tier has a positive monthly and yearly price', () => {
  for (const t of PRICING_TIERS) {
    if (t.monthly !== null) {
      assert.ok(t.monthly > 0, `${t.label} monthly should be positive`);
      assert.ok(t.yearly > 0, `${t.label} yearly should be positive`);
      // Yearly should always be cheaper than paying monthly x 12 — if this
      // ever fails, someone typo'd a price and yearly costs MORE than monthly.
      assert.ok(t.yearly < t.monthly * 12, `${t.label} yearly ($${t.yearly}) should be less than monthly x 12 ($${t.monthly * 12})`);
    }
  }
});

test('tierById: unknown id falls back to the first tier instead of crashing', () => {
  const tier = tierById('not_a_real_tier');
  assert.strictEqual(tier.id, PRICING_TIERS[0].id);
});

test('priceIdFor: builds the expected env var name and reads it', () => {
  process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_test_123';
  assert.strictEqual(priceIdFor('starter', 'monthly'), 'price_test_123');
  delete process.env.STRIPE_PRICE_STARTER_MONTHLY;
});

test('priceIdFor: returns null (not a crash) when the env var is missing', () => {
  assert.strictEqual(priceIdFor('starter', 'monthly'), null);
});
