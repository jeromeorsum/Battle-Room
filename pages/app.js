import { useEffect, useState } from 'react';
import { ZONES, BATTLE_TYPES, LEAGUE_OPTIONS, zoneByCode } from '../lib/constants';
import { enablePushNotifications } from '../lib/pushClient';

function tzLabel(code) { return zoneByCode(code).code; }
function tiktokUrl(handle) { return 'https://www.tiktok.com/@' + (handle || '').replace(/^@/, ''); }

export default function Home() {
  const [agency, setAgency] = useState(null);
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
    try {
      const [cRes, bRes] = await Promise.all([fetch('/api/creators'), fetch('/api/battles')]);
      if (cRes.ok) setCreators(await cRes.json());
      if (bRes.ok) setBattles(await bRes.json());
    } catch (e) { console.error('refresh failed', e); }
  }

  useEffect(() => {
    (async () => {
      try {
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
      } catch (e) {
        console.error('session check failed', e);
      }
      setLoading(false);
    })();
  }, []);

  async function joinAgency(e) {
    if (e) e.preventDefault();
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
        <form className="card" style={{ maxWidth: 380 }} onSubmit={joinAgency}>
          <h2>Enter your agency code</h2>
          <p className="dim">Your agency manager gives you this code — it's how Battle Room keeps your roster separate from every other agency on the platform.</p>
          <input value={agencyCodeInput} onChange={(e) => setAgencyCodeInput(e.target.value.toUpperCase())} placeholder="e.g. FALCON7X2" />
          {agencyError && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{agencyError}</p>}
          <button className="btn" type="submit" style={{ marginTop: 10 }}>Continue</button>
          <p className="dim" style={{ marginTop: 14 }}>Running an agency? <a href="/signup" style={{ color: 'var(--cyan)' }}>Sign up here</a> to get your own code.</p>
        </form>
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
        <button className={step === 'board' ? 'active' : ''} disabled={!me} onClick={() => setStep('board')}>3 · Find a Battle</button>
        <button className={step === 'battles' ? 'active' : ''} disabled={!me} onClick={() => setStep('battles')}>4 · Your Battles</button>
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
      {step === 'board' && me && <BoardStep me={me} />}
      {step === 'battles' && me && (
        <BattlesStep me={me} creators={creators} battles={battles} onChange={refresh} />
      )}
    </div>
  );
}

// Moves focus to the next input/select/button in the same form when Enter
// is pressed on a non-last field, so tapping Enter feels like "next" — the
// last field in each form is a submit button, so Enter there just submits.
function focusNext(e) {
  if (e.key !== 'Enter') return;
  if (e.target.tagName === 'TEXTAREA') return; // allow real newlines
  e.preventDefault();
  const form = e.target.form;
  if (!form) return;
  const fields = Array.from(form.elements).filter((el) => !el.disabled && el.type !== 'hidden');
  const idx = fields.indexOf(e.target);
  const next = fields[idx + 1];
  if (next) next.focus();
  else form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
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

  async function save(e) {
    if (e) e.preventDefault();
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
      <form className="card" onSubmit={save} onKeyDown={focusNext}>
        <h2>My Profile</h2>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>TikTok Handle</label><input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} /></div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Diamonds (30d)</label><input type="number" value={form.diamonds} onChange={(e) => setForm({ ...form, diamonds: Number(e.target.value) })} /></div>
          <div className="field" style={{ flex: 1 }}><label>League</label>
            <select value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })}>
              <option value="">Select…</option>
              {LEAGUE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Timezone</label>
            <select value={form.tz} onChange={(e) => setForm({ ...form, tz: e.target.value })}>
              {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Email (optional, for battle notifications)</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
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
        <div className="field"><label>New PIN (leave blank to keep current)</label><input type="password" maxLength={20} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <button className="btn ghost" type="button" onClick={turnOnPush}>🔔 Enable push notifications</button>
          <button className="btn" type="submit">Save changes</button>
        </div>
        {pushStatus && <p className="dim" style={{ marginTop: 8 }}>{pushStatus}</p>}
      </form>
    );
  }

  return (
    <div className="card">
      <h2>Who are you?</h2>
      <p className="dim">Pick your name and enter your PIN, or create a new profile below. Once you log in, this browser will remember you for 30 days.</p>
      {creators.map((c) => (
        <div key={c.id} style={{ marginBottom: 8 }}>
          {pinAttempt.id === c.id ? (
            <form className="row" style={{ alignItems: 'center' }} onSubmit={(e) => { e.preventDefault(); onLogin(c.id, pinAttempt.value); }}>
              <span>{c.name}</span>
              <input type="password" style={{ maxWidth: 140 }} value={pinAttempt.value}
                onChange={(e) => setPinAttempt({ ...pinAttempt, value: e.target.value })} placeholder="PIN" autoFocus />
              <button className="btn" type="submit" style={{ padding: '6px 12px' }}>Unlock</button>
              <button className="btn ghost" type="button" style={{ padding: '6px 12px' }} onClick={() => setPinAttempt({ id: null, value: '', error: '' })}>Cancel</button>
            </form>
          ) : (
            <button className="btn ghost" style={{ width: '100%', textAlign: 'left' }} onClick={() => setPinAttempt({ id: c.id, value: '', error: '' })}>{c.name} — {c.handle}</button>
          )}
        </div>
      ))}
      {pinAttempt.error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{pinAttempt.error}</p>}

      <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />
      <h2 style={{ fontSize: 16 }}>Create a new profile</h2>
      <form onKeyDown={focusNext} onSubmit={(e) => { e.preventDefault(); if (!form.name || !form.pin) { alert('Name and PIN are required.'); return; } onCreate(form); }}>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>TikTok Handle</label><input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} /></div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Diamonds (30d)</label><input type="number" value={form.diamonds} onChange={(e) => setForm({ ...form, diamonds: Number(e.target.value) })} /></div>
          <div className="field" style={{ flex: 1 }}><label>League</label>
            <select value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })}>
              <option value="">Select…</option>
              {LEAGUE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Timezone</label>
            <select value={form.tz} onChange={(e) => setForm({ ...form, tz: e.target.value })}>
              {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Email (optional)</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
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
        <div className="field"><label>Set a PIN (6+ characters)</label><input type="password" minLength={6} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></div>
        <button className="btn" type="submit">Create Profile &amp; Continue</button>
      </form>
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

function BoardStep({ me }) {
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/posts');
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function post(e) {
    if (e) e.preventDefault();
    if (!message.trim()) return;
    const res = await fetch('/api/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message })
    });
    if (res.ok) { setMessage(''); load(); } else { const d = await res.json(); alert(d.error || 'Could not post.'); }
  }

  async function remove(id) {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <form className="card" onSubmit={post}>
        <h2>Find a Battle</h2>
        <p className="dim">Post what you're looking for — like an LFG board. Anyone in your agency can see it, and only you (or an admin) can delete your post.</p>
        <div className="field"><label>Your post</label><input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} placeholder="e.g. Looking for a chill battle tonight around 8pm ET" /></div>
        <button className="btn" type="submit">Post</button>
      </form>
      {loading ? <p className="dim">Loading…</p> : posts.length === 0 ? <p className="dim">No posts yet — be the first.</p> : posts.map((p) => (
        <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <b>{p.creators ? p.creators.name : 'Someone'}</b>
            <span className="dim"> · {new Date(p.created_at).toLocaleString()}</span>
            <p style={{ margin: '6px 0 0' }}>{p.message}</p>
          </div>
          {p.creator_id === me.id && <button className="btn ghost" style={{ borderColor: 'var(--pink)', color: 'var(--pink)', flexShrink: 0 }} onClick={() => remove(p.id)}>Delete</button>}
        </div>
      ))}
    </div>
  );
}

function BattlesStep({ me, creators, battles, onChange }) {
  const [form, setForm] = useState({ opponent: '', datetime: '', tz: me.tz, notes: '' });
  const nameOf = (id) => creators.find((c) => c.id === id)?.name || 'Unknown';
  const handleOf = (id) => creators.find((c) => c.id === id)?.handle || '';

  const mine = battles.filter((b) => b.creator_a === me.id || b.creator_b === me.id);
  const needsResponse = mine.filter((b) => !b.declined && ((b.creator_a === me.id && !b.accepted_a) || (b.creator_b === me.id && !b.accepted_b)));
  const waiting = mine.filter((b) => !b.declined && !needsResponse.includes(b) && !(b.accepted_a && b.accepted_b));
  const confirmed = mine.filter((b) => !b.declined && b.accepted_a && b.accepted_b);

  async function sendInvite(e) {
    if (e) e.preventDefault();
    if (!form.opponent || !form.datetime) { alert('Pick an opponent and a time.'); return; }
    const res = await fetch('/api/battles', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorA: me.id, creatorB: form.opponent, localDateTime: form.datetime, zoneCode: form.tz, notes: form.notes })
    });
    if (res.ok) { setForm({ opponent: '', datetime: '', tz: me.tz, notes: '' }); onChange(); }
    else { const d = await res.json(); alert(d.error || 'Could not send invite.'); }
  }

  async function respond(id, action) {
    await fetch(`/api/battles/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    onChange();
  }
  async function remove(id) {
    await fetch(`/api/battles/${id}`, { method: 'DELETE' });
    onChange();
  }

  return (
    <div>
      <form className="card" onSubmit={sendInvite} onKeyDown={focusNext}>
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
        <button className="btn" type="submit">Send Invite</button>
      </form>

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
