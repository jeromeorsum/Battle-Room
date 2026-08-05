import { useState } from 'react';
import { PRICING_TIERS } from '../lib/pricing';

export default function Signup() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [form, setForm] = useState({ name: '', adminCode: '', planTier: 'starter', contactEmail: '', contactPhone: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function submit(e) {
    if (e) e.preventDefault();
    setError('');
    if (!form.name || !form.adminCode) { setError('Agency name and an admin code are required.'); return; }
    if (!form.contactEmail || !form.contactPhone) { setError('Contact email and phone are both required.'); return; }
    try {
      const res = await fetch('/api/agencies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, billingPeriod })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Signup failed.'); return; }
      setResult(data);
    } catch (err) {
      setError('Network error — please try again.');
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(result.agency_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadCode() {
    const blob = new Blob([
      `Battle Room — ${result.name}\n\nAgency Code: ${result.agency_code}\n\nKeep this somewhere safe (a password manager is best). Anyone with this code plus an admin code can manage your agency.\n`
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${result.name.replace(/\s+/g, '-').toLowerCase()}-battle-room-code.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  if (result) {
    return (
      <div className="wrap">
        <div className="card" style={{ maxWidth: 480, margin: '60px auto' }}>
          <h2>You're set up 🎉</h2>
          <p className="dim">Save this — there's no email recovery for it, so store it somewhere real (a password manager is best) before sharing it with your creators.</p>
          <div className="field">
            <label>Your Agency Code</label>
            <div className="row" style={{ alignItems: 'center' }}>
              <input readOnly value={result.agency_code} style={{ fontWeight: 700, letterSpacing: 2, flex: 1 }} />
              <button className="btn ghost" onClick={copyCode} type="button">{copied ? 'Copied ✓' : 'Copy'}</button>
            </div>
          </div>
          <button className="btn ghost" onClick={downloadCode} type="button" style={{ width: '100%', marginTop: 6 }}>Download as a text file (backup)</button>
          <p className="dim" style={{ marginTop: 14 }}>Your admin code is the one you just chose — use it together with the agency code above at <code>/admin</code> to book battles and manage your roster.</p>
          <p className="dim">Plan: <b>{result.plan_tier}</b> · Billing: <b>{result.billing_period}</b> · Status: <b>{result.status}</b> — this starter build doesn't collect payment yet.</p>
          <a href="/admin" className="btn" style={{ display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>Go to Admin →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1>Set up your agency</h1>
      <form className="card" style={{ maxWidth: 480 }} onSubmit={submit}>
        <div className="field"><label>Agency name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label>Contact email (required — for billing/account questions)</label><input type="email" required value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
        <div className="field"><label>Contact phone (required)</label><input type="tel" required value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
        <div className="field"><label>Choose an admin code (you'll use this to manage battles)</label><input type="password" value={form.adminCode} onChange={(e) => setForm({ ...form, adminCode: e.target.value })} /></div>

        <div className="field">
          <label>Plan</label>
          <div className="row" style={{ marginBottom: 8 }}>
            <button type="button" className={billingPeriod === 'monthly' ? 'btn' : 'btn ghost'} onClick={() => setBillingPeriod('monthly')}>Monthly</button>
            <button type="button" className={billingPeriod === 'yearly' ? 'btn' : 'btn ghost'} onClick={() => setBillingPeriod('yearly')}>Yearly</button>
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
        <button className="btn" type="submit">Create Agency</button>
        <p className="dim" style={{ marginTop: 10 }}>This starter build doesn't collect payment yet — signing up starts a trial.</p>
      </form>
    </div>
  );
}
