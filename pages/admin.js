import { useEffect, useState } from 'react';
import { ZONES, BATTLE_TYPES, LEAGUE_OPTIONS, zoneByCode } from '../lib/constants';
import { PRICING_TIERS } from '../lib/pricing';
import Avatar from '../components/Avatar';
import PasswordField from '../components/PasswordField';
import DateTimePicker from '../components/DateTimePicker';
import DiamondInput from '../components/DiamondInput';
import { SkeletonList } from '../components/Skeleton';

export default function Admin() {
  const [agency, setAgency] = useState(null);
  const [adminTab, setAdminTab] = useState('dashboard'); // dashboard | settings | activity
  const [codes, setCodes] = useState({ agencyCode: '', adminCode: '', remember: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState([]);
  const [battles, setBattles] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [posts, setPosts] = useState([]);
  const [filters, setFilters] = useState({ min: '', max: '', type: 'all' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [bulkTagKey, setBulkTagKey] = useState('');
  const [bookForm, setBookForm] = useState({ a: '', b: '', datetime: '', tz: 'ET', notes: '' });
  const [addForm, setAddForm] = useState({ name: '', handle: '', diamonds: 0, league: '', tz: 'ET', tags: [], pin: '' });
  const [addError, setAddError] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  const [pendingBilling, setPendingBilling] = useState(null); // { type: 'checkout'|'portal', planTier?, billingPeriod? }
  const [billingCodeSent, setBillingCodeSent] = useState(false);
  const [billingCode, setBillingCode] = useState('');
  const [codeForm, setCodeForm] = useState({ current: '', next: '' });
  const [codeMsg, setCodeMsg] = useState('');
  const [managerCodeForm, setManagerCodeForm] = useState('');
  const [managerCodeMsg, setManagerCodeMsg] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [accentMsg, setAccentMsg] = useState('');
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
          setAccentColor(data.accent_color || '');
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
      setAccentColor(data.accent_color || '');
      setCodes({ agencyCode: '', adminCode: '', remember: false });
      loadRoster();
    } catch (e) { setError('Network error — try again.'); }
  }

  async function loadRoster() {
    try {
      const [cRes, bRes, pRes, aRes] = await Promise.all([fetch('/api/creators'), fetch('/api/battles'), fetch('/api/posts'), fetch('/api/admin/audit-log')]);
      if (cRes.ok) setCreators(await cRes.json());
      if (bRes.ok) setBattles(await bRes.json());
      if (pRes.ok) setPosts(await pRes.json());
      if (aRes.ok) setAuditLog(await aRes.json());
    } catch (e) { console.error('loadRoster failed', e); }
  }

  function exportRosterCSV() {
    const header = ['Nickname', 'Handle', 'Diamonds (30d)', 'League', 'Timezone', 'Battle Types', 'Gender'];
    const rows = creators.map((c) => [
      c.name, c.handle || '', c.diamonds || 0, c.league || '', c.tz || '', (c.tags || []).join('; '), c.gender || ''
    ]);
    const escapeCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(agency?.name || 'roster').replace(/\s+/g, '-').toLowerCase()}-roster.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'admin' }) });
    setAgency(null); setCreators([]); setBattles([]);
  }

  useEffect(() => {
    if (!agency?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`battleroom-filter-presets-${agency.id}`) || '[]');
      setPresets(saved);
    } catch (e) { setPresets([]); }
  }, [agency?.id]);

  function savePreset() {
    if (!presetName.trim()) return;
    const next = [...presets.filter((p) => p.name !== presetName.trim()), { name: presetName.trim(), filters }];
    setPresets(next);
    localStorage.setItem(`battleroom-filter-presets-${agency.id}`, JSON.stringify(next));
    setPresetName('');
  }
  function deletePreset(name) {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    localStorage.setItem(`battleroom-filter-presets-${agency.id}`, JSON.stringify(next));
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAllFiltered(filteredList) {
    setSelectedIds(new Set(filteredList.map((c) => c.id)));
  }
  function clearSelection() { setSelectedIds(new Set()); }

  async function bulkRemove() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Remove ${selectedIds.size} creator(s) from the roster? This can't be undone.`)) return;
    const previous = creators;
    setCreators((prev) => prev.filter((c) => !selectedIds.has(c.id))); // optimistic
    const results = await Promise.all([...selectedIds].map((id) => fetch(`/api/creators/${id}`, { method: 'DELETE' })));
    if (results.some((r) => !r.ok)) { setCreators(previous); alert('Some removals failed — please try again.'); }
    clearSelection();
    loadRoster();
  }

  async function bulkAddTag() {
    if (selectedIds.size === 0 || !bulkTagKey) return;
    await Promise.all([...selectedIds].map(async (id) => {
      const c = creators.find((x) => x.id === id);
      if (!c) return;
      const nextTags = c.tags.includes(bulkTagKey) ? c.tags : [...c.tags, bulkTagKey];
      await fetch(`/api/creators/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: c.name, handle: c.handle, diamonds: c.diamonds, league: c.league, tz: c.tz, tags: nextTags })
      });
    }));
    clearSelection();
    loadRoster();
  }

  async function removeCreator(id, name) {
    if (!confirm(`Remove ${name} from the roster? This can't be undone.`)) return;
    const previous = creators;
    setCreators((prev) => prev.filter((c) => c.id !== id)); // optimistic
    const res = await fetch(`/api/creators/${id}`, { method: 'DELETE' });
    if (!res.ok) { setCreators(previous); alert('Could not remove creator.'); return; }
    loadRoster();
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

  async function setManagerCode(e) {
    if (e) e.preventDefault();
    setManagerCodeMsg('');
    if (!managerCodeForm) { setManagerCodeMsg('Enter a code.'); return; }
    const res = await fetch('/api/admin/set-manager-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newCode: managerCodeForm })
    });
    const data = await res.json();
    if (!res.ok) { setManagerCodeMsg(data.error || 'Could not set manager code.'); return; }
    setManagerCodeMsg('Manager code set.');
    setManagerCodeForm('');
  }

  async function saveAccentColor() {
    setAccentMsg('');
    const res = await fetch('/api/admin/set-accent-color', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accentColor })
    });
    const data = await res.json();
    if (!res.ok) { setAccentMsg(data.error || 'Could not save color.'); return; }
    setAccentMsg('Saved — reload to see it everywhere.');
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

  // Billing now requires a step-up verification code (emailed to the
  // agency's contact address) before checkout or the billing portal will
  // proceed — a real second factor specifically for money actions.
  async function initiateBilling(action) {
    setPendingBilling(action);
    setBillingCodeSent(false);
    setBillingCode('');
    setBillingLoading(true);
    try {
      const res = await fetch('/api/billing/request-code', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Could not send verification code.'); setPendingBilling(null); setBillingLoading(false); return; }
      setBillingCodeSent(true);
    } catch (e) { alert('Network error.'); setPendingBilling(null); }
    setBillingLoading(false);
  }

  async function confirmBilling() {
    if (!pendingBilling || !billingCode) return;
    setBillingLoading(true);
    try {
      if (pendingBilling.type === 'checkout') {
        const res = await fetch('/api/checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planTier: pendingBilling.planTier, billingPeriod: pendingBilling.billingPeriod, verificationCode: billingCode })
        });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Could not start checkout.'); setBillingLoading(false); return; }
        window.location.href = data.url;
      } else {
        const res = await fetch('/api/create-portal-session', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verificationCode: billingCode })
        });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Could not open billing portal.'); setBillingLoading(false); return; }
        window.location.href = data.url;
      }
    } catch (e) { alert('Network error.'); setBillingLoading(false); }
  }

  function cancelBilling() { setPendingBilling(null); setBillingCodeSent(false); setBillingCode(''); setBillingLoading(false); }

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

  if (loading) return <div className="wrap"><SkeletonList count={3} /></div>;

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
  const isManager = agency.role === 'manager';
  const trialDaysLeft = agency.status === 'trialing' && agency.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(agency.trial_ends_at) - new Date()) / (24 * 60 * 60 * 1000)))
    : null;

  return (
    <div className="wrap" style={accentColor ? { '--gold': accentColor } : undefined}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>Admin</h1>
          <div className="dim">{agency.name} · {creators.length}/{agency.max_creators} creators · plan: {agency.plan_tier}{isManager ? ' · logged in as manager' : ''}</div>
          {trialDaysLeft !== null && <div className="dim" style={{ marginTop: 4, color: trialDaysLeft <= 3 ? 'var(--pink)' : 'var(--text-dim)' }}>{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left in your trial</div>}
        </div>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>

      <div className="tabs">
        <button className={adminTab === 'dashboard' ? 'active' : ''} onClick={() => setAdminTab('dashboard')}>Dashboard</button>
        {!isManager && <button className={adminTab === 'settings' ? 'active' : ''} onClick={() => setAdminTab('settings')}>Settings</button>}
        <button className={adminTab === 'activity' ? 'active' : ''} onClick={() => setAdminTab('activity')}>Activity Log</button>
      </div>

      {inactive && (
        <div className="card" style={{ borderColor: 'var(--pink)' }}>
          <b style={{ color: 'var(--pink)' }}>This agency's subscription is {agency.status === 'canceled' ? 'canceled' : 'past due'}.</b>
          <p className="dim" style={{ margin: '6px 0 0' }}>You can still view your existing roster and battles, but adding new people, booking new battles, responding to invites, and posting are all paused until this is resolved. {!isManager && 'Subscribe from the Settings tab to reactivate.'}</p>
        </div>
      )}

      {adminTab === 'dashboard' && (
        <>
          {showOnboarding && (creators.length === 0 || battles.length === 0) && (
            <div className="card" style={{ borderColor: 'var(--gold)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2>Getting Started</h2>
                <button className="btn ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setShowOnboarding(false)}>Dismiss</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="dim">{creators.length > 0 ? '✅' : '⬜'} Add your first creator (use the form below, or share your agency code so they can sign themselves up)</div>
                <div className="dim">{battles.length > 0 ? '✅' : '⬜'} Book your first battle, or wait for a creator to send an invite</div>
                <div className="dim">⬜ Save your agency code and admin code somewhere safe — there's no automatic recovery for the agency code itself</div>
              </div>
            </div>
          )}

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ margin: 0 }}>Roster</h2>
              <button className="btn ghost" style={{ fontSize: 12 }} onClick={exportRosterCSV} disabled={creators.length === 0}>⬇ Export as CSV</button>
            </div>
            <div className="row" style={{ marginBottom: 10, marginTop: 10 }}>
              <div className="field"><label>Min diamonds</label><DiamondInput value={filters.min === '' ? 0 : Number(filters.min)} onChange={(v) => setFilters({ ...filters, min: v })} /></div>
              <div className="field"><label>Max diamonds</label><DiamondInput value={filters.max === '' ? 0 : Number(filters.max)} onChange={(v) => setFilters({ ...filters, max: v })} /></div>
              <div className="field"><label>Battle type</label>
                <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                  <option value="all">All types</option>
                  {BATTLE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="row" style={{ marginBottom: 14, alignItems: 'center' }}>
              <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Name this filter combo…" style={{ maxWidth: 200 }} />
              <button className="btn ghost" style={{ fontSize: 12 }} onClick={savePreset}>Save as preset</button>
              {presets.map((p) => (
                <span key={p.name} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <span onClick={() => setFilters(p.filters)}>{p.name}</span>
                  <span onClick={() => deletePreset(p.name)} style={{ color: 'var(--pink)' }}>✕</span>
                </span>
              ))}
            </div>

            {selectedIds.size > 0 && (
              <div className="row" style={{ marginBottom: 14, alignItems: 'center', background: 'var(--bg-raised)', padding: '8px 12px', borderRadius: 8 }}>
                <span className="dim">{selectedIds.size} selected</span>
                <select value={bulkTagKey} onChange={(e) => setBulkTagKey(e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="">Add tag…</option>
                  {BATTLE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <button className="btn ghost" style={{ fontSize: 12 }} onClick={bulkAddTag} disabled={!bulkTagKey}>Apply Tag</button>
                {!isManager && <button className="btn ghost" style={{ fontSize: 12, borderColor: 'var(--pink)', color: 'var(--pink)' }} onClick={bulkRemove}>Remove Selected</button>}
                <button className="btn ghost" style={{ fontSize: 12 }} onClick={clearSelection}>Clear</button>
              </div>
            )}

            {filtered.length === 0 ? <p className="dim">No creators match.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="row" style={{ alignItems: 'center' }}>
                  <label className="dim" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={(e) => e.target.checked ? selectAllFiltered(filtered) : clearSelection()} style={{ width: 'auto' }} />
                    Select all ({filtered.length})
                  </label>
                </div>
                {filtered.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-raised)', border: selectedIds.has(c.id) ? '1px solid var(--gold)' : '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ width: 'auto' }} />
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
                      {!isManager && <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => resetCreatorPin(c.id, c.name)}>Reset PIN</button>}
                      {!isManager && <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12, borderColor: 'var(--pink)', color: 'var(--pink)' }} onClick={() => removeCreator(c.id, c.name)}>Remove</button>}
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
        </>
      )}

      {adminTab === 'settings' && !isManager && (
        <>
          <div className="card">
            <h2>Billing</h2>
            <p className="dim">Status: <b>{agency.status}</b> · Plan: <b>{agency.plan_tier}</b> ({agency.billing_period})</p>

            {pendingBilling ? (
              <div>
                {!billingCodeSent ? (
                  <p className="dim">Sending you a verification code…</p>
                ) : (
                  <>
                    <p className="dim">Enter the 6-digit code we emailed to your contact address to continue.</p>
                    <div className="field" style={{ maxWidth: 200 }}>
                      <input value={billingCode} onChange={(e) => setBillingCode(e.target.value)} placeholder="123456" maxLength={6} />
                    </div>
                    <div className="row">
                      <button className="btn ghost" onClick={cancelBilling}>Cancel</button>
                      <button className="btn" disabled={billingLoading || billingCode.length !== 6} onClick={confirmBilling}>Confirm &amp; Continue</button>
                    </div>
                  </>
                )}
              </div>
            ) : agency.status === 'trialing' || agency.status === 'canceled' || agency.status === 'past_due' ? (
              <>
                <p className="dim">Subscribe to keep full access after your trial ends. We'll email a verification code before this goes through.</p>
                <div className="row">
                  {PRICING_TIERS.filter((t) => t.monthly).map((t) => (
                    <div key={t.id} className="card" style={{ flex: 1, minWidth: 160 }}>
                      <b>{t.label}</b>
                      <div className="dim">${t.monthly}/mo or ${t.yearly}/yr</div>
                      <div className="row" style={{ marginTop: 6 }}>
                        <button className="btn ghost" disabled={billingLoading} onClick={() => initiateBilling({ type: 'checkout', planTier: t.id, billingPeriod: 'monthly' })}>Monthly</button>
                        <button className="btn ghost" disabled={billingLoading} onClick={() => initiateBilling({ type: 'checkout', planTier: t.id, billingPeriod: 'yearly' })}>Yearly</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <button className="btn ghost" disabled={billingLoading} onClick={() => initiateBilling({ type: 'portal' })}>Manage Subscription</button>
            )}
          </div>

          <div className="card">
            <h2>Referral</h2>
            {agency.referral_code ? (
              <p className="dim">Your referral code: <b style={{ color: 'var(--gold)' }}>{agency.referral_code}</b> — share it with other agencies. When someone you refer becomes a paying customer, you get a free month automatically.</p>
            ) : <p className="dim">No referral code on file.</p>}
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

          <form className="card" onSubmit={setManagerCode} onKeyDown={focusNext}>
            <h2>Manager Code</h2>
            <p className="dim">Give this to staff who should be able to book battles and manage the roster, but not touch billing or remove creators.</p>
            <div className="field" style={{ maxWidth: 300 }}><label>New manager code (8+ characters)</label>
              <PasswordField value={managerCodeForm} onChange={(e) => setManagerCodeForm(e.target.value)} minLength={8} />
            </div>
            {managerCodeMsg && <p style={{ color: managerCodeMsg.includes('set') ? 'var(--green)' : 'var(--pink)', fontSize: 12 }}>{managerCodeMsg}</p>}
            <button className="btn" type="submit">Set Manager Code</button>
          </form>

          <div className="card">
            <h2>Accent Color</h2>
            <p className="dim">A light branding touch — replaces the gold accent color across your admin panel.</p>
            <div className="row" style={{ alignItems: 'center' }}>
              <input type="color" value={accentColor || '#ffd447'} onChange={(e) => setAccentColor(e.target.value)} style={{ width: 60, padding: 4 }} />
              <button className="btn ghost" onClick={saveAccentColor}>Save</button>
              {accentColor && <button className="btn ghost" onClick={() => { setAccentColor(''); saveAccentColor(); }}>Reset to default</button>}
            </div>
            {accentMsg && <p className="dim" style={{ fontSize: 12 }}>{accentMsg}</p>}
          </div>
        </>
      )}

      {adminTab === 'activity' && (
        <div className="card">
          <h2>Activity Log</h2>
          {auditLog.length === 0 ? <p className="dim" style={{ marginTop: 10 }}>No activity recorded yet.</p> : (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {auditLog.map((entry) => (
                <div key={entry.id} className="dim" style={{ fontSize: 12, borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>
                  <span style={{ color: 'var(--text)' }}>{entry.actor_label}</span> — {entry.action}{entry.target ? `: ${entry.target}` : ''}
                  <span style={{ float: 'right' }}>{new Date(entry.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
