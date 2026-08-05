import { useEffect, useState } from 'react';
import { PRICING_TIERS, tierById } from '../lib/pricing';
import PasswordField from '../components/PasswordField';

export default function SuperAdmin() {
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [agencies, setAgencies] = useState([]);

  useEffect(() => { checkSession(); }, []);

  async function checkSession() {
    const res = await fetch('/api/super-admin/agencies');
    if (res.ok) { setAgencies(await res.json()); setUnlocked(true); }
    setLoading(false);
  }

  async function submitLogin(e) {
    if (e) e.preventDefault();
    setError('');
    const res = await fetch('/api/super-admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Login failed.'); return; }
    setCode('');
    checkSession();
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'superadmin' }) });
    setUnlocked(false); setAgencies([]);
  }

  async function updateAgency(id, patch) {
    const res = await fetch(`/api/super-admin/agencies/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
    });
    if (res.ok) checkSession();
    else alert('Update failed.');
  }

  if (loading) return <div className="wrap"><p className="dim">Loading…</p></div>;

  if (!unlocked) {
    return (
      <div className="wrap">
        <form className="card" style={{ maxWidth: 360, margin: '60px auto' }} onSubmit={submitLogin}>
          <h2>Super Admin</h2>
          <p className="dim">This code is set as the SUPER_ADMIN_CODE environment variable — only you should know it.</p>
          <PasswordField value={code} onChange={(e) => setCode(e.target.value)} placeholder="Super admin code" />
          {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
          <button className="btn" type="submit" style={{ marginTop: 10 }}>Unlock</button>
        </form>
      </div>
    );
  }

  const STATUS_LABEL = { trialing: 'Trial', active: 'Active ✅', past_due: 'Past due ⚠️', canceled: 'Cut off ⛔' };
  const STATUS_COLOR = { trialing: 'var(--gold)', active: 'var(--green)', past_due: 'var(--pink)', canceled: 'var(--text-dim)' };

  return (
    <div className="wrap">
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Super Admin — All Agencies</h1>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>
      <p className="dim">{agencies.length} agencies on the platform</p>
      {agencies.map((a) => {
        const tier = tierById(a.plan_tier);
        const price = tier.monthly ? `$${a.billing_period === 'yearly' ? tier.yearly : tier.monthly}/${a.billing_period === 'yearly' ? 'yr' : 'mo'}` : 'Custom';
        return (
          <div key={a.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <b>{a.name}</b> <span className="dim">({a.agency_code})</span>
                <div style={{ marginTop: 4 }}>
                  <span className="badge" style={{ borderColor: STATUS_COLOR[a.status], color: STATUS_COLOR[a.status] }}>{STATUS_LABEL[a.status] || a.status}</span>
                  {' '}<span className="badge">{tier.label} — {price}</span>
                </div>
                <div className="dim" style={{ marginTop: 6 }}>
                  {a.creatorCount}/{a.max_creators} creators · created {new Date(a.created_at).toLocaleDateString()}
                </div>
                <div className="dim" style={{ marginTop: 4 }}>
                  {a.contact_email ? `✉️ ${a.contact_email}` : 'No contact email on file'}
                  {a.contact_phone ? ` · 📞 ${a.contact_phone}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <div className="row">
                  <select value={a.plan_tier} onChange={(e) => updateAgency(a.id, { plan_tier: e.target.value, max_creators: PRICING_TIERS.find(t => t.id === e.target.value)?.maxCreators || 100000 })}>
                    {PRICING_TIERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <select value={a.billing_period} onChange={(e) => updateAgency(a.id, { billing_period: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="row">
                  <select value={a.status} onChange={(e) => updateAgency(a.id, { status: e.target.value })}>
                    <option value="trialing">Trialing</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
                <div className="dim" style={{ fontSize: 10, maxWidth: 200, textAlign: 'right' }}>
                  Status updates automatically from Stripe once billing is connected — this dropdown is a manual override for edge cases.
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
