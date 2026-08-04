import { useEffect, useState } from 'react';
import { PRICING_TIERS } from '../lib/pricing';

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

  async function submitLogin() {
    setError('');
    const res = await fetch('/api/super-admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Login failed.'); return; }
    setCode(''); // don't keep the raw code in memory once we're logged in
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
        <div className="card" style={{ maxWidth: 360, margin: '60px auto' }}>
          <h2>Super Admin</h2>
          <p className="dim">This code is set as the SUPER_ADMIN_CODE environment variable — only you should know it. Sessions expire after 2 hours.</p>
          <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Super admin code" />
          {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
          <button className="btn" style={{ marginTop: 10 }} onClick={submitLogin}>Unlock</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Super Admin — All Agencies</h1>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>
      <p className="dim">{agencies.length} agencies on the platform</p>
      {agencies.map((a) => (
        <div key={a.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <b>{a.name}</b> <span className="dim">({a.agency_code})</span>
              <div className="dim">{a.creatorCount}/{a.max_creators} creators · created {new Date(a.created_at).toLocaleDateString()}</div>
            </div>
            <div className="row">
              <select value={a.plan_tier} onChange={(e) => updateAgency(a.id, { plan_tier: e.target.value, max_creators: PRICING_TIERS.find(t => t.id === e.target.value)?.maxCreators || 100000 })}>
                {PRICING_TIERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <select value={a.billing_period} onChange={(e) => updateAgency(a.id, { billing_period: e.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <select value={a.status} onChange={(e) => updateAgency(a.id, { status: e.target.value })}>
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past due</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
