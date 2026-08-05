import { useEffect, useState } from 'react';
import { ZONES, BATTLE_TYPES, LEAGUE_OPTIONS, zoneByCode } from '../lib/constants';
import { PRICING_TIERS } from '../lib/pricing';
import Avatar from '../components/Avatar';
import PasswordField from '../components/PasswordField';
import DateTimePicker from '../components/DateTimePicker';
import DiamondInput from '../components/DiamondInput';

export default function Admin() {
  const [agency, setAgency] = useState(null);
  const [codes, setCodes] = useState({ agencyCode: '', adminCode: '', remember: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState([]);
  const [battles, setBattles] = useState([]);
  const [posts, setPosts] = useState([]);
  const [filters, setFilters] = useState({ min: '', max: '', type: 'all' });
  const [bookForm, setBookForm] = useState({ a: '', b: '', datetime: '', tz: 'ET', notes: '' });
  const [addForm, setAddForm] = useState({ name: '', handle: '', diamonds: 0, league: '', tz: 'ET', tags: [], pin: '' });
  const [addError, setAddError] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  const [codeForm, setCodeForm] = useState({ current: '', next: '' });
  const [codeMsg, setCodeMsg] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotForm, setForgotForm] = useState({ agencyCode: '', contactEmail: '' });
  const [forgotMsg, setForgotMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin-session');
        if (res.ok) {
          const data = await res.json();
          setAgency(data);
          await loadRoster();
        } else if (res.status === 402) {
          const d = await res.json();
          setError(d.error);
        }
      } catch (e) { console.error('admin session check failed', e); }
      setLoading(false);
    })();
  }, []);

  async function submitLogin(e) {
    if (e) e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codes)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed.'); return; }
      setAgency(data);
      setCodes({ agencyCode: '', adminCode: '', remember: false });
      loadRoster();
    } catch (e) { setError('Network error — try again.'); }
  }

  async function loadRoster() {
    try {
      const [cRes, bRes, pRes] = await Promise.all([fetch('/api/creators'), fetch('/api/battles'), fetch('/api/posts')]);
      if (cRes.ok) setCreators(await cRes.json());
      if (bRes.ok) setBattles(await bRes.json());
      if (pRes.ok) setPosts(await pRes.json());
    } catch (e) { console.error('loadRoster failed', e); }
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

  async function resetCreatorPin(id, name) {
    const newPin = prompt(`Set a new temporary PIN for ${name} (6+ characters). Tell them this PIN so they can log in and change it themselves.`);
    if (!newPin) return;
    if (newPin.length < 6) { alert('PIN must be at least 6 characters.'); return; }
    const creator = creators.find((c) => c.id === id);
    const res = await fetch(`/api/creators/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: creator.name, handle: creator.handle, diamonds: creator.diamonds, league: creator.league, tz: creator.tz, tags: creator.tags, pin: newPin })
    });
    if (res.ok) alert(`New PIN set for ${name}.`); else alert('Could not reset PIN.');
  }

  async function removePost(id) {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    loadRoster();
  }

  async function changeAdminCode(e) {
    if (e) e.preventDefault();
    setCodeMsg('');
    if (!codeForm.current || !codeForm.next) { setCodeMsg('Fill in both fields.'); return; }
    const res = await fetch('/api/admin/change-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentCode: codeForm.current, newCode: codeForm.next })
    });
    const data = await res.json();
    if (!res.ok) { setCodeMsg(data.error || 'Could not change code.'); return; }
    setCodeMsg('Admin code updated.');
    setCodeForm({ current: '', next: '' });
  }

  async function addCreator(e) {
    if (e) e.preventDefault();
    setAddError('');
    if (!addForm.name || !addForm.pin) { setAddError('Nickname and a starting PIN are required.'); return; }
    if (addForm.pin.length < 6) { setAddError('PIN must be at least 6 characters.'); return; }
    const res = await fetch('/api/creators', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm)
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error || 'Could not add creator.'); return; }
    setAddForm({ name: '', handle: '', diamonds: 0, league: '', tz: 'ET', tags: [], pin: '' });
    loadRoster();
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

  async function startCheckout(planTier, billingPeriod) {
    setBillingLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planTier, billingPeriod })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Could not start checkout.'); setBillingLoading(false); return; }
      window.location.href = data.url;
    } catch (e) { alert('Network error.'); setBillingLoading(false); }
  }

  async function openBillingPortal() {
    setBillingLoading(true);
    try {
      const res = await fetch('/api/create-portal-session', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Could not open billing portal.'); setBillingLoading(false); return; }
      window.location.href = data.url;
    } catch (e) { alert('Network error.'); setBillingLoading(false); }
  }

  async function submitForgot(e) {
    if (e) e.preventDefault();
    setForgotMsg('');
    const res = await fetch('/api/forgot-admin-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(forgotForm)
    });
    const data = await res.json();
    setForgotMsg(data.message || data.error || 'Request sent.');
  }

  function focusNext(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const form = e.target.form;
    if (!form) return;
    const fields = Array.from(form.elements).filter((el) => !el.disabled && el.type !== 'hidden');
    const idx = fields.indexOf(e.target);
    const next = fields[idx + 1];
    if (next) next.focus();
    else form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  if (loading) return <div className="wrap"><p className="dim">Loading…</p></div>;

  if (!agency) {
    return (
      <div className="wrap">
        <form className="card" style={{ maxWidth: 380, margin: '60px auto' }} onSubmit={submitLogin} onKeyDown={focusNext}>
          <h2>Agency Admin Login</h2>
          <p className="dim">Enter your agency code and your personal admin code.</p>
          <div className="field"><label>Agency code</label><input value={codes.agencyCode} onChange={(e) => setCodes({ ...codes, agencyCode: e.target.value.toUpperCase() })} placeholder="e.g. FALCON7X2" /></div>
          <div className="field"><label>Admin code</label>
            <PasswordField value={codes.adminCode} onChange={(e) => setCodes({ ...codes, adminCode: e.target.value })} placeholder="Admin code" />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 12px' }}>
            <input type="checkbox" checked={codes.remember} onChange={(e) => setCodes({ ...codes, remember: e.target.checked })} style={{ width: 'auto' }} />
            <span className="dim">Remember me on this device for 30 days</span>
          </label>
          {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
          <button className="btn" type="submit">Unlock</button>
          <p className="dim" style={{ marginTop: 14 }}>No agency yet? <a href="/signup" style={{ color: 'var(--cyan)' }}>Sign up here</a>.</p>
          <button type="button" className="btn ghost" style={{ marginTop: 10, width: '100%' }} onClick={() => setForgotOpen((v) => !v)}>
            {forgotOpen ? 'Hide' : 'Forgot your admin code?'}
          </button>
          {forgotOpen && (
            <div style={{ marginTop: 10 }}>
              <div className="field"><label>Agency code</label><input value={forgotForm.agencyCode} onChange={(e) => setForgotForm({ ...forgotForm, agencyCode: e.target.value.toUpperCase() })} /></div>
              <div className="field"><label>Contact email on file</label><input type="email" value={forgotForm.contactEmail} onChange={(e) => setForgotForm({ ...forgotForm, contactEmail: e.target.value })} /></div>
              {forgotMsg && <p className="dim" style={{ fontSize: 12 }}>{forgotMsg}</p>}
              <button type="button" className="btn" style={{ width: '100%' }} onClick={submitForgot}>Send Reset Link</button>
            </div>
          )}
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
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>Admin</h1>
          <div className="dim">{agency.name} · {creators.length}/{agency.max_creators} creators · plan: {agency.plan_tier}</div>
        </div>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>

      {inactive && (
        <div className="card" style={{ borderColor: 'var(--pink)' }}>
          <b style={{ color: 'var(--pink)' }}>This agency's subscription is {agency.status === 'canceled' ? 'canceled' : 'past due'}.</b>
          <p className="dim" style={{ margin: '6px 0 0' }}>You can still view your existing roster and battles, but adding new people, booking new battles, responding to invites, and posting are all paused until this is resolved.</p>
        </div>
      )}

      <div className="card">
        <h2>Billing</h2>
        <p className="dim">Status: <b>{agency.status}</b> · Plan: <b>{agency.plan_tier}</b> ({agency.billing_period})</p>
        {agency.status === 'trialing' || agency.status === 'canceled' || agency.status === 'past_due' ? (
          <>
            <p className="dim">Subscribe to keep full access after your trial ends:</p>
            <div className="row">
              {PRICING_TIERS.filter((t) => t.monthly).map((t) => (
                <div key={t.id} className="card" style={{ flex: 1, minWidth: 160 }}>
                  <b>{t.label}</b>
                  <div className="dim">${t.monthly}/mo or ${t.yearly}/yr</div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <button className="btn ghost" disabled={billingLoading} onClick={() => startCheckout(t.id, 'monthly')}>Monthly</button>
                    <button className="btn ghost" disabled={billingLoading} onClick={() => startCheckout(t.id, 'yearly')}>Yearly</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <button className="btn ghost" disabled={billingLoading} onClick={openBillingPortal}>Manage Subscription</button>
        )}
      </div>

      <form className="card" onSubmit={changeAdminCode} onKeyDown={focusNext}>
        <h2>Change Admin Code</h2>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Current admin code</label>
            <PasswordField value={codeForm.current} onChange={(e) => setCodeForm({ ...codeForm, current: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}><label>New admin code (8+ characters)</label>
            <PasswordField value={codeForm.next} onChange={(e) => setCodeForm({ ...codeForm, next: e.target.value })} minLength={8} />
          </div>
        </div>
        {codeMsg && <p style={{ color: codeMsg.includes('updated') ? 'var(--green)' : 'var(--pink)', fontSize: 12 }}>{codeMsg}</p>}
        <button className="btn" type="submit">Update Admin Code</button>
      </form>

      {posts.some((p) => p.reported) && (
        <div className="card" style={{ borderColor: 'var(--pink)' }}>
          <h2 style={{ color: 'var(--pink)' }}>Reported Posts</h2>
          {posts.filter((p) => p.reported).map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', marginBottom: 6 }}>
              <div><b>{p.creators ? p.creators.name : 'Someone'}</b><p className="dim" style={{ margin: '2px 0 0' }}>{p.message}</p></div>
              <button className="btn ghost" style={{ borderColor: 'var(--pink)', color: 'var(--pink)' }} onClick={() => removePost(p.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <form className="card" onSubmit={addCreator} onKeyDown={focusNext}>
        <h2>Add a Creator</h2>
        <p className="dim">Add someone directly — give them the starting PIN so they can log in and change it themselves later.</p>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Nickname</label><input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>TikTok Handle</label><input value={addForm.handle} onChange={(e) => setAddForm({ ...addForm, handle: e.target.value })} placeholder="no @ needed" /></div>
          <div className="field" style={{ flex: 1 }}><label>Diamonds (30d)</label>
            <DiamondInput value={addForm.diamonds} onChange={(v) => setAddForm({ ...addForm, diamonds: v })} />
          </div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>League</label>
            <select value={addForm.league} onChange={(e) => setAddForm({ ...addForm, league: e.target.value })}>
              <option value="">Select…</option>
              {LEAGUE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Timezone</label>
            <select value={addForm.tz} onChange={(e) => setAddForm({ ...addForm, tz: e.target.value })}>
              {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Starting PIN (6+ characters)</label>
            <PasswordField value={addForm.pin} onChange={(e) => setAddForm({ ...addForm, pin: e.target.value })} minLength={6} />
          </div>
        </div>
        <div className="field">
          <label>Battle types (optional — they can also set this themselves later)</label>
          <div className="row">
            {BATTLE_TYPES.map((t) => (
              <label key={t.key} className="chip">
                <input type="checkbox" checked={addForm.tags.includes(t.key)} onChange={() => setAddForm((f) => ({ ...f, tags: f.tags.includes(t.key) ? f.tags.filter((x) => x !== t.key) : [...f.tags, t.key] }))} /> {t.label}
              </label>
            ))}
          </div>
        </div>
        {addError && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{addError}</p>}
        <button className="btn" type="submit">Add to Roster</button>
      </form>

      <div className="card">
        <h2>Roster</h2>
        <div className="row" style={{ marginBottom: 14 }}>
          <div className="field"><label>Min diamonds</label><DiamondInput value={filters.min === '' ? 0 : Number(filters.min)} onChange={(v) => setFilters({ ...filters, min: v })} /></div>
          <div className="field"><label>Max diamonds</label><DiamondInput value={filters.max === '' ? 0 : Number(filters.max)} onChange={(v) => setFilters({ ...filters, max: v })} /></div>
          <div className="field"><label>Battle type</label>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="all">All types</option>
              {BATTLE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
        </div>
        {filtered.length === 0 ? <p className="dim">No creators match.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                  <Avatar url={c.avatar_url} name={c.name} size={32} />
                  <b>{c.name}</b> <span className="dim">{c.handle}</span>
                </div>
                <div className="dim" style={{ minWidth: 100 }}>{(c.diamonds || 0).toLocaleString()} 💎</div>
                <div className="dim" style={{ minWidth: 50 }}>{c.league || '—'}</div>
                <div className="dim" style={{ minWidth: 40 }}>{c.tz}</div>
                <div className="row" style={{ minWidth: 120 }}>{(c.tags || []).map((t) => <span key={t} className="badge">{t}</span>)}</div>
                <div className="row">
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setBookForm({ ...bookForm, a: c.id })}>Set A</button>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setBookForm({ ...bookForm, b: c.id })}>Set B</button>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => resetCreatorPin(c.id, c.name)}>Reset PIN</button>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12, borderColor: 'var(--pink)', color: 'var(--pink)' }} onClick={() => removeCreator(c.id, c.name)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="card" onSubmit={bookBattle} onKeyDown={focusNext}>
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
          <div className="field" style={{ flex: 1 }}><label>Timezone</label>
            <select value={bookForm.tz} onChange={(e) => setBookForm({ ...bookForm, tz: e.target.value })}>
              {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Date &amp; Time</label>
          <DateTimePicker value={bookForm.datetime} onChange={(v) => setBookForm({ ...bookForm, datetime: v })} />
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
              <div className="vs-actions">
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
