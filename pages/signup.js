import { useState } from 'react';
import { PRICING_TIERS } from '../lib/pricing';

export default function Signup() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [form, setForm] = useState({ name: '', adminCode: '', planTier: 'starter' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!form.name || !form.adminCode) { setError('Agency name and an admin code are required.'); return; }
    const res = await fetch('/api/agencies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, billingPeriod })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Signup failed.'); return; }
    setResult(data);
  }

  if (result) {
    return (
      <div className="wrap">
        <div className="card" style={{ maxWidth: 480, margin: '60px auto' }}>
          <h2>You're set up 🎉</h2>
          <p className="dim">Save these — you'll need them to get in. There's no email recovery for these codes, so store them somewhere safe (a password manager works well).</p>
          <div className="field"><label>Your Agency Code (give this to your creators)</label>
            <input readOnly value={result.agency_code} style={{ fontWeight: 700, letterSpacing: 2 }} />
          </div>
          <p className="dim">Your admin code is the one you just chose — use it together with the agency code above at <code>/admin</code> to book battles and manage your roster.</p>
          <p className="dim">Plan: <b>{result.plan_tier}</b> · Billing: <b>{result.billing_period}</b> · Status: <b>{result.status}</b> (trial — no payment collected yet in this starter build; see the README for wiring up Stripe).</p>
          <a href="/admin" className="btn" style={{ display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>Go to Admin →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1>Set up your agency</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="field"><label>Agency name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label>Choose an admin code (you'll use this to manage battles)</label><input type="password" value={form.adminCode} onChange={(e) => setForm({ ...form, adminCode: e.target.value })} /></div>

        <div className="field">
          <label>Plan</label>
          <div className="row" style={{ marginBottom: 8 }}>
            <button className={billingPeriod === 'monthly' ? 'btn' : 'btn ghost'} onClick={() => setBillingPeriod('monthly')}>Monthly</button>
            <button className={billingPeriod === 'yearly' ? 'btn' : 'btn ghost'} onClick={() => setBillingPeriod('yearly')}>Yearly</button>
          </div>
          <select value={form.planTier} onChange={(e) => setForm({ ...form, planTier: e.target.value })}>
            {PRICING_TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} — {t.monthly ? `$${billingPeriod === 'yearly' ? t.yearly : t.monthly}/${billingPeriod === 'yearly' ? 'yr' : 'mo'}` : 'contact us'}
              </option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
        <button className="btn" onClick={submit}>Create Agency</button>
        <p className="dim" style={{ marginTop: 10 }}>This starter build doesn't collect payment yet — signing up starts a trial. See the README for hooking up Stripe before charging real agencies.</p>
      </div>
    </div>
  );
}
