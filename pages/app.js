import { useEffect, useState } from 'react';
import { ZONES, BATTLE_TYPES, zoneByCode } from '../lib/constants';
import { enablePushNotifications } from '../lib/pushClient';

function tzLabel(code) { return zoneByCode(code).code; }
function tiktokUrl(handle) { return 'https://www.tiktok.com/@' + (handle || '').replace(/^@/, ''); }

export default function Home() {
  const [agency, setAgency] = useState(null); // { id, name }
  const [agencyCodeInput, setAgencyCodeInput] = useState('');
  const [agencyError, setAgencyError] = useState('');
  const [creators, setCreators] = useState([]);
  const [battles, setBattles] = useState([]);
  const [myId, setMyId] = useState(null);
  const [step, setStep] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [pinAttempt, setPinAttempt] = useState({ id: null, value: '', error: '' });

  const me = creators.find((c) => c.id === myId);

  async function refresh(agencyId) {
    const aid = agencyId || agency?.id;
    if (!aid) return;
    const [cRes, bRes] = await Promise.all([
      fetch(`/api/creators?agencyId=${aid}`),
      fetch(`/api/battles?agencyId=${aid}`)
    ]);
    setCreators(await cRes.json());
    setBattles(await bRes.json());
  }

  useEffect(() => {
    (async () => {
      // Try the strongest session first (fully logged in as a creator),
      // then fall back to "just knows the agency code" — never trust
      // localStorage for anything security-relevant, only ask the server.
      const sessRes = await fetch('/api/session');
      if (sessRes.ok) {
        const s = await sessRes.json();
        setAgency({ id: s.agencyId, name: s.agencyName });
        setMyId(s.creatorId);
        await refresh(s.agencyId);
        setLoading(false);
        return;
      }
      const agencyRes = await fetch('/api/agency-session');
      if (agencyRes.ok) {
        const a = await agencyRes.json();
        setAgency({ id: a.id, name: a.name });
        await refresh(a.id);
      }
      setLoading(false);
    })();
  }, []);

  async function joinAgency() {
    setAgencyError('');
    const res = await fetch('/api/agencies/resolve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agencyCode: agencyCodeInput })
    });
    const data = await res.json();
    if (!res.ok) { setAgencyError(data.error || 'Agency not found.'); return; }
    setAgency({ id: data.id, name: data.name });
    refresh(data.id);
  }

  async function switchAgency() {
    await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'agency' }) });
    setAgency(null); setMyId(null); setCreators([]); setBattles([]); setStep('profile');
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'creator' }) });
    setMyId(null);
    setStep('profile');
  }

  async function createProfile(form) {
    const res = await fetch('/api/creators', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    });
    const created = await res.json();
    if (!res.ok) { alert(created.error || 'Could not create profile.'); return; }
    setMyId(created.id);
    setStep('opponents');
    refresh();
  }

  async function login(id, pin) {
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creatorId: id, pin })
    });
    const data = await res.json();
    if (!res.ok) { setPinAttempt({ id, value: '', error: data.error || 'Login failed.' }); return; }
    setMyId(data.id);
    setStep('opponents');
  }

  if (loading) return <div className="wrap"><p className="dim">Loading…</p></div>;

  if (!agency) {
    return (
      <div className="wrap">
        <h1>BATTLE ROOM</h1>
        <div className="card" style={{ maxWidth: 380 }}>
          <h2>Enter your agency code</h2>
          <p className="dim">Your agency manager gives you this code — it's how Battle Room keeps your roster separate from every other agency on the platform.</p>
          <input value={agencyCodeInput} onChange={(e) => setAgencyCodeInput(e.target.value.toUpperCase())} placeholder="e.g. FALCON7X2" />
          {agencyError && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{agencyError}</p>}
          <button className="btn" style={{ marginTop: 10 }} onClick={joinAgency}>Continue</button>
          <p className="dim" style={{ marginTop: 14 }}>Running an agency? <a href="/signup" style={{ color: 'var(--cyan)' }}>Sign up here</a> to get your own code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1>BATTLE ROOM</h1>
          <div className="dim">{agency.name} · Live PK Schedule</div>
        </div>
        <div className="dim" style={{ textAlign: 'right' }}>
          {me && (<>Logged in as <b style={{ color: 'var(--gold)' }}>{me.name}</b><br /></>)}
          {me && <button className="btn ghost" style={{ marginTop: 4, padding: '4px 10px', fontSize: 11, marginRight: 6 }} onClick={logout}>Switch profile</button>}
          <button className="btn ghost" style={{ marginTop: 4, padding: '4px 10px', fontSize: 11 }} onClick={switchAgency}>Switch agency</button>
        </div>
      </header>

      <div className="tabs">
        <button className={step === 'profile' ? 'active' : ''} onClick={() => setStep('profile')}>1 · Profile</button>
        <button className={step === 'opponents' ? 'active' : ''} disabled={!me} onClick={() => setStep('opponents')}>2 · Find Opponent</button>
        <button className={step === 'battles' ? 'active' : ''} disabled={!me} onClick={() => setStep('battles')}>3 · Your Battles</button>
      </div>

      {step === 'profile' && (
        <ProfileStep
          me={me} creators={creators} pinAttempt={pinAttempt} setPinAttempt={setPinAttempt}
          onCreate={createProfile} onLogin={login} onSaved={refresh}
        />
      )}
      {step === 'opponents' && me && (
        <OpponentsStep me={me} creators={creators} onPropose={() => setStep('battles')} />
      )}
      {step === 'battles' && me && (
        <BattlesStep me={me} creators={creators} battles={battles} agencyId={agency.id} onChange={refresh} />
      )}
    </div>
  );
}

function ProfileStep({ me, creators, pinAttempt, setPinAttempt, onCreate, onLogin, onSaved }) {
  const [form, setForm] = useState(() => me
    ? { name: me.name, handle: me.handle || '', email: me.email || '', diamonds: me.diamonds || 0, league: me.league || '', tz: me.tz || 'ET', tags: me.tags || [], pin: '' }
    : { name: '', handle: '', email: '', diamonds: 0, league: '', tz: 'ET', tags: [], pin: '' }
  );
  const [pushStatus, setPushStatus] = useState('');

  function toggleTag(key) {
    setForm((f) => ({ ...f, tags: f.tags.includes(key) ? f.tags.filter((t) => t !== key) : [...f.tags, key] }));
  }

  async function save() {
    const res = await fetch(`/api/creators/${me.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    });
    if (res.ok) { onSaved(); alert('Saved.'); } else { alert('Save failed.'); }
  }

  async function turnOnPush() {
    try { await enablePushNotifications(); setPushStatus('Notifications enabled ✅'); }
    catch (e) { setPushStatus(e.message); }
  }

  if (me) {
    return (
      <div className="card">
        <h2>My Profile</h2>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>TikTok Handle</label><input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} /></div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Diamonds (30d)</label><input type="number" value={form.diamonds} onChange={(e) => setForm({ ...form, diamonds: Number(e.target.value) })} /></div>
          <div className="field" style={{ flex: 1 }}><label>League</label><input value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} placeholder="e.g. A1, C3" /></div>
          <div className="field" style={{ flex: 1 }}><label>Timezone</label>
            <select value={form.tz} onChange={(e) => setForm({ ...form, tz: e.target.value })}>
              {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Email (optional, for battle notifications)</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="field">
          <label>Battle types you do</label>
          <div className="row">
            {BATTLE_TYPES.map((t) => (
              <label key={t.key} className="dim" style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--bg-raised)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <input type="checkbox" checked={form.tags.includes(t.key)} onChange={() => toggleTag(t.key)} /> {t.label}
              </label>
            ))}
          </div>
        </div>
        <div className="field"><label>New PIN (leave blank to keep current)</label><input type="password" maxLength={6} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <button className="btn ghost" onClick={turnOnPush}>🔔 Enable push notifications</button>
          <button className="btn" onClick={save}>Save changes</button>
        </div>
        {pushStatus && <p className="dim" style={{ marginTop: 8 }}>{pushStatus}</p>}
      </div>
    );
  }

  // Not logged in
  return (
    <div className="card">
      <h2>Who are you?</h2>
      <p className="dim">Pick your name and enter your PIN, or create a new profile below.</p>
      {creators.map((c) => (
        <div key={c.id} style={{ marginBottom: 8 }}>
          {pinAttempt.id === c.id ? (
            <div className="row" style={{ alignItems: 'center' }}>
              <span>{c.name}</span>
              <input type="password" maxLength={6} style={{ maxWidth: 100 }} value={pinAttempt.value}
                onChange={(e) => setPinAttempt({ ...pinAttempt, value: e.target.value })} placeholder="PIN" autoFocus />
              <button className="btn" style={{ padding: '6px 12px' }} onClick={() => onLogin(c.id, pinAttempt.value)}>Unlock</button>
              <button className="btn ghost" style={{ padding: '6px 12px' }} onClick={() => setPinAttempt({ id: null, value: '', error: '' })}>Cancel</button>
            </div>
          ) : (
            <button className="btn ghost" style={{ width: '100%', textAlign: 'left' }} onClick={() => setPinAttempt({ id: c.id, value: '', error: '' })}>{c.name} — {c.handle}</button>
          )}
        </div>
      ))}
      {pinAttempt.error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{pinAttempt.error}</p>}

      <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />
      <h2 style={{ fontSize: 16 }}>Create a new profile</h2>
      <div className="row">
        <div className="field" style={{ flex: 1 }}><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field" style={{ flex: 1 }}><label>TikTok Handle</label><input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} /></div>
      </div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}><label>Diamonds (30d)</label><input type="number" value={form.diamonds} onChange={(e) => setForm({ ...form, diamonds: Number(e.target.value) })} /></div>
        <div className="field" style={{ flex: 1 }}><label>League</label><input value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} placeholder="e.g. A1, C3" /></div>
        <div className="field" style={{ flex: 1 }}><label>Timezone</label>
          <select value={form.tz} onChange={(e) => setForm({ ...form, tz: e.target.value })}>
            {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>Email (optional)</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div className="field">
        <label>Battle types you do</label>
        <div className="row">
          {BATTLE_TYPES.map((t) => (
            <label key={t.key} className="dim" style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--bg-raised)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)' }}>
              <input type="checkbox" checked={form.tags.includes(t.key)} onChange={() => toggleTag(t.key)} /> {t.label}
            </label>
          ))}
        </div>
      </div>
      <div className="field"><label>Set a PIN</label><input type="password" maxLength={6} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></div>
      <button className="btn" onClick={() => { if (!form.name || !form.pin) { alert('Name and PIN are required.'); return; } onCreate(form); }}>Create Profile &amp; Continue</button>
    </div>
  );
}

function OpponentsStep({ me, creators, onPropose }) {
  const others = creators.filter((c) => c.id !== me.id);
  const scored = others.map((s) => {
    const diamondDiff = Math.abs((s.diamonds || 0) - (me.diamonds || 0));
    const tzPenalty = s.tz === me.tz ? 0 : 5000;
    return { s, score: diamondDiff + tzPenalty };
  }).sort((a, b) => a.score - b.score);

  return (
    <div>
      <div className="card">
        <b>You:</b> {me.name} · {(me.diamonds || 0).toLocaleString()} 💎 · {me.league || '—'} · {tzLabel(me.tz)}
      </div>
      <div className="opp-grid">
        {scored.map(({ s }) => (
          <div key={s.id} className="card">
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            <div className="dim">{s.handle}</div>
            <div>{(s.diamonds || 0).toLocaleString()} 💎</div>
            <div className="dim">{s.league || '—'} · {tzLabel(s.tz)}</div>
            <div className="row" style={{ marginTop: 6 }}>{(s.tags || []).map((t) => <span key={t} className="badge">{t}</span>)}</div>
            <a className="dim" href={tiktokUrl(s.handle)} target="_blank" rel="noopener noreferrer">View on TikTok ↗</a>
            <div style={{ marginTop: 8 }}><button className="btn ghost" onClick={onPropose}>Propose Battle</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BattlesStep({ me, creators, battles, agencyId, onChange }) {
  const [form, setForm] = useState({ opponent: '', datetime: '', tz: me.tz, notes: '' });
  const nameOf = (id) => creators.find((c) => c.id === id)?.name || 'Unknown';
  const handleOf = (id) => creators.find((c) => c.id === id)?.handle || '';

  const mine = battles.filter((b) => b.creator_a === me.id || b.creator_b === me.id);
  const needsResponse = mine.filter((b) => !b.declined && ((b.creator_a === me.id && !b.accepted_a) || (b.creator_b === me.id && !b.accepted_b)));
  const waiting = mine.filter((b) => !b.declined && !needsResponse.includes(b) && !(b.accepted_a && b.accepted_b));
  const confirmed = mine.filter((b) => !b.declined && b.accepted_a && b.accepted_b);

  async function sendInvite() {
    if (!form.opponent || !form.datetime) { alert('Pick an opponent and a time.'); return; }
    const res = await fetch('/api/battles', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyId, creatorA: me.id, creatorB: form.opponent, localDateTime: form.datetime, zoneCode: form.tz, notes: form.notes, proposerId: me.id })
    });
    if (res.ok) { setForm({ opponent: '', datetime: '', tz: me.tz, notes: '' }); onChange(); } else { alert('Could not send invite.'); }
  }

  async function respond(id, action) {
    await fetch(`/api/battles/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, actorId: me.id }) });
    onChange();
  }
  async function remove(id) {
    await fetch(`/api/battles/${id}`, { method: 'DELETE' });
    onChange();
  }

  return (
    <div>
      <div className="card">
        <h2>Invite Someone to Battle</h2>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Opponent</label>
            <select value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })}>
              <option value="">Select…</option>
              {creators.filter((c) => c.id !== me.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Date &amp; Time</label><input type="datetime-local" value={form.datetime} onChange={(e) => setForm({ ...form, datetime: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>Time zone for this time</label>
            <select value={form.tz} onChange={(e) => setForm({ ...form, tz: e.target.value })}>
              {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <button className="btn" onClick={sendInvite}>Send Invite</button>
      </div>

      {needsResponse.length > 0 && <h3>Needs Your Response</h3>}
      {needsResponse.map((b) => (
        <div key={b.id} className="vs">
          <div className="side">{nameOf(b.creator_a)}<div className="dim">{handleOf(b.creator_a)}</div></div>
          <div className="mid">VS</div>
          <div className="side b">{nameOf(b.creator_b)}<div className="dim">{handleOf(b.creator_b)}</div></div>
          <div style={{ padding: 12 }}>
            <button className="btn ghost" onClick={() => respond(b.id, 'decline')}>Decline</button>{' '}
            <button className="btn" onClick={() => respond(b.id, 'accept')}>Accept</button>
          </div>
        </div>
      ))}

      {waiting.length > 0 && <h3>Waiting on a Response</h3>}
      {waiting.map((b) => (
        <div key={b.id} className="vs">
          <div className="side">{nameOf(b.creator_a)}</div>
          <div className="mid">VS</div>
          <div className="side b">{nameOf(b.creator_b)}</div>
          <div style={{ padding: 12 }}><button className="btn ghost" onClick={() => remove(b.id)}>Cancel invite</button></div>
        </div>
      ))}

      <h3>Your Calendar</h3>
      {confirmed.length === 0 && <p className="dim">No confirmed battles yet.</p>}
      {confirmed.map((b) => (
        <div key={b.id} className="vs">
          <div className="side">{nameOf(b.creator_a)}<br /><a className="dim" href={tiktokUrl(handleOf(b.creator_a))} target="_blank" rel="noopener noreferrer">TikTok ↗</a></div>
          <div className="mid">VS</div>
          <div className="side b">{nameOf(b.creator_b)}<br /><a className="dim" href={tiktokUrl(handleOf(b.creator_b))} target="_blank" rel="noopener noreferrer">TikTok ↗</a></div>
          <div style={{ padding: 12 }}>
            <div className="dim">{new Date(b.datetime_utc).toLocaleString()}</div>
            <button className="btn ghost" onClick={() => remove(b.id)}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}
