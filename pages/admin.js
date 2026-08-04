import { useEffect, useState } from 'react';
import { ZONES, BATTLE_TYPES, zoneByCode } from '../lib/constants';

export default function Admin() {
  const [agency, setAgency] = useState(null);
  const [codes, setCodes] = useState({ agencyCode: '', adminCode: '', remember: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState([]);
  const [battles, setBattles] = useState([]);
  const [filters, setFilters] = useState({ min: '', max: '', type: 'all' });
  const [bookForm, setBookForm] = useState({ a: '', b: '', datetime: '', tz: 'ET', notes: '' });

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin-session');
      if (res.ok) {
        const data = await res.json();
        setAgency(data);
        await loadRoster();
      }
      setLoading(false);
    })();
  }, []);

  async function submitLogin(e) {
    if (e) e.preventDefault();
    setError('');
    const res = await fetch('/api/admin-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(codes)
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Login failed.'); return; }
    setAgency(data);
    setCodes({ agencyCode: '', adminCode: '', remember: false });
    loadRoster();
  }

  async function loadRoster() {
    const [cRes, bRes] = await Promise.all([fetch('/api/creators'), fetch('/api/battles')]);
    if (cRes.ok) setCreators(await cRes.json());
    if (bRes.ok) setBattles(await bRes.json());
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'admin' }) });
    setAgency(null); setCreators([]); setBattles([]);
  }

  async function removeCreator(id, name) {
    if (!confirm(`Remove ${name} from the roster? This can't be undone.`)) return;
    const res = await fetch(`/api/creators/${id}`, { method: 'DELETE' });
    if (res.ok) loadRoster();
    else alert('Could not remove creator.');
  }

  async function bookBattle(e) {
    if (e) e.preventDefault();
    if (!bookForm.a || !bookForm.b || bookForm.a === bookForm.b || !bookForm.datetime) { alert('Pick two different creators and a time.'); return; }
    const res = await fetch('/api/battles', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorA: bookForm.a, creatorB: bookForm.b, localDateTime: bookForm.datetime, zoneCode: bookForm.tz, notes: bookForm.notes })
    });
    if (res.ok) { loadRoster(); setBookForm({ a: '', b: '', datetime: '', tz: 'ET', notes: '' }); }
    else { const d = await res.json(); alert(d.error || 'Could not book battle.'); }
  }

  if (loading) return <div className="wrap"><p className="dim">Loading…</p></div>;

  if (!agency) {
    return (
      <div className="wrap">
        <form className="card" style={{ maxWidth: 380, margin: '60px auto' }} onSubmit={submitLogin}>
          <h2>Agency Admin Login</h2>
          <p className="dim">Enter your agency code and your personal admin code.</p>
          <div className="field"><label>Agency code</label><input value={codes.agencyCode} onChange={(e) => setCodes({ ...codes, agencyCode: e.target.value.toUpperCase() })} placeholder="e.g. FALCON7X2" /></div>
          <div className="field"><label>Admin code</label><input type="password" value={codes.adminCode} onChange={(e) => setCodes({ ...codes, adminCode: e.target.value })} placeholder="Admin code" /></div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 12px' }}>
            <input type="checkbox" checked={codes.remember} onChange={(e) => setCodes({ ...codes, remember: e.target.checked })} style={{ width: 'auto' }} />
            <span className="dim">Remember me on this device for 30 days</span>
          </label>
          {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
          <button className="btn" type="submit">Unlock</button>
          <p className="dim" style={{ marginTop: 14 }}>No agency yet? <a href="/signup" style={{ color: 'var(--cyan)' }}>Sign up here</a>.</p>
        </form>
      </div>
    );
  }

  const filtered = creators.filter((c) => {
    if (filters.min !== '' && (c.diamonds || 0) < Number(filters.min)) return false;
    if (filters.max !== '' && (c.diamonds || 0) > Number(filters.max)) return false;
    if (filters.type !== 'all' && !(c.tags || []).includes(filters.type)) return false;
    return true;
  }).sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0));

  const inactive = agency.status === 'past_due' || agency.status === 'canceled';

  return (
    <div className="wrap">
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Admin</h1>
          <div className="dim">{agency.name} · {creators.length}/{agency.max_creators} creators · plan: {agency.plan_tier}</div>
        </div>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>

      {inactive && (
        <div className="card" style={{ borderColor: 'var(--pink)' }}>
          <b style={{ color: 'var(--pink)' }}>This agency's subscription is {agency.status === 'canceled' ? 'canceled' : 'past due'}.</b>
          <p className="dim" style={{ margin: '6px 0 0' }}>You can still view your existing roster and battles, but creating new profiles or booking new battles is paused until this is resolved. Contact the platform owner to reactivate.</p>
        </div>
      )}

      <div className="card">
        <h2>Search Roster</h2>
        <div className="row">
          <div className="field"><label>Min diamonds</label><input type="number" value={filters.min} onChange={(e) => setFilters({ ...filters, min: e.target.value })} /></div>
          <div className="field"><label>Max diamonds</label><input type="number" value={filters.max} onChange={(e) => setFilters({ ...filters, max: e.target.value })} /></div>
          <div className="field"><label>Battle type</label>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="all">All types</option>
              {BATTLE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="opp-grid">
          {filtered.map((c) => (
            <div key={c.id} className="card">
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div className="dim">{(c.diamonds || 0).toLocaleString()} 💎 · {c.league || '—'}</div>
              <div className="row">{(c.tags || []).map((t) => <span key={t} className="badge">{t}</span>)}</div>
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn ghost" onClick={() => setBookForm({ ...bookForm, a: c.id })}>Set as A</button>
                <button className="btn ghost" onClick={() => setBookForm({ ...bookForm, b: c.id })}>Set as B</button>
              </div>
              <button className="btn ghost" style={{ marginTop: 4, borderColor: 'var(--pink)', color: 'var(--pink)' }} onClick={() => removeCreator(c.id, c.name)}>Remove from roster</button>
            </div>
          ))}
        </div>
      </div>

      <form className="card" onSubmit={bookBattle}>
        <h2>Book a Battle</h2>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Creator A</label>
            <select value={bookForm.a} onChange={(e) => setBookForm({ ...bookForm, a: e.target.value })}>
              <option value="">Select…</option>{creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Creator B</label>
            <select value={bookForm.b} onChange={(e) => setBookForm({ ...bookForm, b: e.target.value })}>
              <option value="">Select…</option>{creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Date &amp; Time</label><input type="datetime-local" value={bookForm.datetime} onChange={(e) => setBookForm({ ...bookForm, datetime: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>Timezone</label>
            <select value={bookForm.tz} onChange={(e) => setBookForm({ ...bookForm, tz: e.target.value })}>
              {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
            </select>
          </div>
        </div>
        <button className="btn" type="submit">Book Battle</button>
      </form>

      <div className="card">
        <h2>All Battles</h2>
        {battles.map((b) => {
          const a = creators.find((c) => c.id === b.creator_a);
          const bb = creators.find((c) => c.id === b.creator_b);
          const status = b.declined ? 'Declined' : (b.accepted_a && b.accepted_b) ? 'Confirmed' : 'Pending';
          return (
            <div key={b.id} className="vs">
              <div className="side">{a ? a.name : '?'}</div>
              <div className="mid">VS</div>
              <div className="side b">{bb ? bb.name : '?'}</div>
              <div style={{ padding: 12 }}>
                <span className="badge">{status}</span><br />
                <span className="dim">{new Date(b.datetime_utc).toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
