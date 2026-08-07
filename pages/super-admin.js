import { useEffect, useState } from 'react';
import { PRICING_TIERS, tierById } from '../lib/pricing';
import PasswordField from '../components/PasswordField';
import { SkeletonList } from '../components/Skeleton';

export default function SuperAdmin() {
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [agencies, setAgencies] = useState([]);
  const [search, setSearch] = useState('');
  const [openRoster, setOpenRoster] = useState(null); // agencyId currently expanded
  const [rosterCreators, setRosterCreators] = useState([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterLoading, setRosterLoading] = useState(false);
  const [superTab, setSuperTab] = useState('agencies'); // agencies | new-info
  const [newInfo, setNewInfo] = useState({ agencies: [], creators: [] });
  const [newInfoLoading, setNewInfoLoading] = useState(false);

  async function loadNewInfo() {
    setNewInfoLoading(true);
    const res = await fetch('/api/super-admin/new-info');
    if (res.ok) setNewInfo(await res.json());
    setNewInfoLoading(false);
  }

  async function toggleRoster(agencyId) {
    if (openRoster === agencyId) { setOpenRoster(null); return; }
    setOpenRoster(agencyId);
    setRosterLoading(true);
    const res = await fetch(`/api/super-admin/agency-creators?agencyId=${agencyId}`);
    if (res.ok) setRosterCreators(await res.json());
    setRosterLoading(false);
  }

  async function resetCreatorPin(creatorId, name) {
    const newPin = prompt(`Set a new temporary PIN for ${name} (6+ characters):`);
    if (!newPin) return;
    const res = await fetch('/api/super-admin/reset-creator-pin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creatorId, newPin })
    });
    if (res.ok) alert(`New PIN set for ${name}.`); else alert('Could not reset PIN.');
  }

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

  async function resetAdminCode(id, name) {
    const newCode = prompt(`Set a new admin code for ${name} (8+ characters). Tell them this code so they can log in and change it themselves.`);
    if (!newCode) return;
    if (newCode.length < 8) { alert('Admin code must be at least 8 characters.'); return; }
    const res = await fetch('/api/super-admin/reset-admin-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agencyId: id, newCode })
    });
    if (res.ok) alert(`New admin code set for ${name}.`); else alert('Could not reset admin code.');
  }

  if (loading) return <div className="wrap"><SkeletonList count={3} /></div>;

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
  const q = search.trim().toLowerCase();
  const filteredAgencies = q
    ? agencies.filter((a) => a.name.toLowerCase().startsWith(q))
    : agencies;

  return (
    <div className="wrap">
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Super Admin — All Agencies</h1>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>

      <div className="tabs">
        <button className={superTab === 'agencies' ? 'active' : ''} onClick={() => setSuperTab('agencies')}>Agencies</button>
        <button className={superTab === 'new-info' ? 'active' : ''} onClick={() => { setSuperTab('new-info'); if (newInfo.agencies.length === 0) loadNewInfo(); }}>New Info</button>
      </div>

      {superTab === 'new-info' && (
        <div>
          <p className="dim">Recent signups across the platform. Agencies flagged in pink share a signup IP address with another recent agency — a possible sign of the same person creating multiple accounts to get another free trial. Shared office wifi can also cause this, so treat it as a prompt to look closer, not proof on its own.</p>
          {newInfoLoading ? <SkeletonList count={3} /> : (
            <>
              <div className="card">
                <h2>Recent Agencies</h2>
                {newInfo.agencies.length === 0 ? <p className="dim">Nothing yet.</p> : newInfo.agencies.map((a) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <b>{a.name}</b> <span className="dim">{a.contact_email}</span>
                      {a.flagged && <span className="badge" style={{ marginLeft: 8, borderColor: 'var(--pink)', color: 'var(--pink)' }}>⚠ Shared signup IP</span>}
                    </div>
                    <span className="dim" style={{ fontSize: 12 }}>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <h2>Recent Creators</h2>
                {newInfo.creators.length === 0 ? <p className="dim">Nothing yet.</p> : newInfo.creators.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <div><b>{c.name}</b> <span className="dim">{c.handle}</span></div>
                    <span className="dim" style={{ fontSize: 12 }}>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {superTab === 'agencies' && (
      <>
      <div className="field" style={{ maxWidth: 320 }}>
        <label>Search agencies by name</label>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" />
      </div>
      <p className="dim">{filteredAgencies.length} of {agencies.length} agencies</p>
      {filteredAgencies.map((a) => {
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
                <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => resetAdminCode(a.id, a.name)}>Reset Admin Code</button>
                <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => toggleRoster(a.id)}>{openRoster === a.id ? 'Hide Roster' : 'View Roster'}</button>
              </div>
            </div>
            {openRoster === a.id && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <input value={rosterSearch} onChange={(e) => setRosterSearch(e.target.value)} placeholder="Search creators…" style={{ marginBottom: 10, maxWidth: 240 }} />
                {rosterLoading ? <SkeletonList count={2} /> : (() => {
                  const rq = rosterSearch.trim().toLowerCase();
                  const rFiltered = rq ? rosterCreators.filter((c) => c.name.toLowerCase().includes(rq) || (c.handle || '').toLowerCase().includes(rq)) : rosterCreators;
                  return rFiltered.length === 0 ? <p className="dim">No creators match.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {rFiltered.map((c) => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px' }}>
                          <span>{c.name} <span className="dim">{c.handle}</span></span>
                          <button className="btn ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => resetCreatorPin(c.id, c.name)}>Reset PIN</button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
      </>
      )}
    </div>
  );
}
