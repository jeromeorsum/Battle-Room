import { useEffect, useState } from 'react';
import { ZONES, BATTLE_TYPES, LEAGUE_OPTIONS, zoneByCode } from '../lib/constants';
import { enablePushNotifications, disablePushNotifications } from '../lib/pushClient';
import { downloadICS, googleCalendarUrl } from '../lib/calendarClient';
import { shareOrDownloadBattleCard } from '../lib/shareCard';
import Avatar from '../components/Avatar';
import PasswordField from '../components/PasswordField';
import DateTimePicker from '../components/DateTimePicker';
import DiamondInput from '../components/DiamondInput';
import InstallPrompt from '../components/InstallPrompt';
import { SkeletonList } from '../components/Skeleton';
import QuickSearch from '../components/QuickSearch';

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

  const me = creators.find((c) => c.id === myId);

  async function refresh(agencyId) {
    const aid = agencyId || agency?.id;
    if (!aid) return;
    try {
      const creatorHeader = { headers: { 'X-Session-Role': 'creator' } };
      const [cRes, bRes] = await Promise.all([fetch('/api/creators', creatorHeader), fetch('/api/battles', creatorHeader)]);
      if (cRes.status === 402 || bRes.status === 402) {
        setAgency(null); setMyId(null); setCreators([]); setBattles([]); setStep('profile');
        setAgencyError('This agency\u2019s account is inactive. Contact your agency admin.');
        return;
      }
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
          setAgency({ id: s.agencyId, name: s.agencyName, code: s.agencyCode });
          setMyId(s.creatorId);
          await refresh(s.agencyId);
          setLoading(false);
          return;
        }
        if (sessRes.status === 402) { const d = await sessRes.json(); setAgencyError(d.error); setLoading(false); return; }
        const agencyRes = await fetch('/api/agency-session');
        if (agencyRes.ok) {
          const a = await agencyRes.json();
          setAgency({ id: a.id, name: a.name, code: a.agency_code });
          await refresh(a.id);
        } else if (agencyRes.status === 402) {
          const d = await agencyRes.json(); setAgencyError(d.error);
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
    setAgency({ id: data.id, name: data.name, code: agencyCodeInput.trim().toUpperCase() });
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

  async function createProfile(form, avatarFile) {
    const res = await fetch('/api/creators', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, agencyCode: agency.code })
    });
    const created = await res.json();
    if (!res.ok) { alert(created.error || 'Could not create profile.'); return; }
    if (agency) localStorage.setItem(`battleroom-last-handle-${agency.id}`, created.name);
    setMyId(created.id);
    if (avatarFile) {
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(avatarFile);
        });
        await fetch('/api/upload-avatar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl })
        });
      } catch (e) { console.error('avatar upload failed', e); }
    }
    setStep('opponents');
    refresh();
  }

  async function login(identifier, pin) {
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, pin })
    });
    const data = await res.json();
    if (!res.ok) { return data.error || 'Login failed.'; }
    if (agency) localStorage.setItem(`battleroom-last-handle-${agency.id}`, identifier);
    setMyId(data.id);
    setStep('opponents');
    return null;
  }

  if (loading) return <div className="wrap"><SkeletonList count={2} /></div>;

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
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
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

      {me && <PushReminder />}
      {me && <InstallPrompt />}
      {me && <QuickSearch creators={creators} myId={me.id} onSelect={() => setStep('opponents')} />}

      {step === 'profile' && (
        <ProfileStep
          me={me} creators={creators} agencyId={agency.id}
          onCreate={createProfile} onLogin={login} onSaved={refresh}
        />
      )}
      {step === 'opponents' && me && (
        <OpponentsStep me={me} creators={creators} onPropose={() => setStep('battles')} />
      )}
      {step === 'battles' && me && (
        <BattlesStep me={me} creators={creators} battles={battles} onChange={refresh} onFindOpponent={() => setStep('opponents')} />
      )}
    </div>
  );
}

function PushReminder() {
  const [status, setStatus] = useState('checking');
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) { setStatus('unsupported'); return; }
    setStatus(Notification.permission); // 'default' | 'granted' | 'denied'
  }, []);

  async function enable() {
    setBusy(true);
    try { await enablePushNotifications(); setStatus('granted'); }
    catch (e) { alert(e.message); }
    setBusy(false);
  }

  if (status === 'granted' || dismissed) return null;

  return (
    <div className="card" style={{ borderColor: 'var(--gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <div>
        <b>🔔 Turn on notifications</b>
        <p className="dim" style={{ margin: '4px 0 0' }}>
          Get alerted the moment a battle's proposed or confirmed — no need to keep checking back.
          {status === 'unsupported' && <> On iPhone: tap Share → "Add to Home Screen" first, then reopen from there.</>}
        </p>
      </div>
      <div className="row">
        <button className="btn" disabled={busy} onClick={enable}>Enable Now</button>
        <button className="btn ghost" onClick={() => setDismissed(true)}>Not now</button>
      </div>
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

function AvatarUploader({ me, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload-avatar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: reader.result })
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Upload failed.'); setBusy(false); return; }
        onUploaded(data.avatar_url);
      } catch (err) { setError('Upload failed.'); }
      setBusy(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="field">
      <label>Profile picture (optional)</label>
      <div className="row" style={{ alignItems: 'center' }}>
        <Avatar url={me?.avatar_url} name={me?.name} size={56} />
        <label className="btn ghost" style={{ cursor: 'pointer' }}>
          {busy ? 'Uploading…' : 'Choose photo'}
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} disabled={busy} />
        </label>
      </div>
      {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
    </div>
  );
}

function ProfileStep({ me, creators, agencyId, onCreate, onLogin, onSaved }) {
  const [form, setForm] = useState(() => me
    ? { name: me.name, handle: me.handle || '', diamonds: me.diamonds || 0, league: me.league || '', tz: me.tz || 'ET', tags: me.tags || [], gender: me.gender || '', pin: '', currentPin: '' }
    : { name: '', handle: '', diamonds: 0, league: '', tz: 'ET', tags: [], gender: '', pin: '' }
  );
  const [pushStatus, setPushStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(me?.avatar_url || null);

  function toggleTag(key) {
    setForm((f) => ({ ...f, tags: f.tags.includes(key) ? f.tags.filter((t) => t !== key) : [...f.tags, key] }));
  }

  async function save(e) {
    if (e) e.preventDefault();
    setSaveError('');
    if (form.pin && !form.currentPin) { setSaveError('Enter your current PIN to set a new one.'); return; }
    const res = await fetch(`/api/creators/${me.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    });
    const data = await res.json();
    if (res.ok) { onSaved(); setForm((f) => ({ ...f, pin: '', currentPin: '' })); alert('Saved.'); }
    else { setSaveError(data.error || 'Save failed.'); }
  }

  async function turnOnPush() {
    try { await enablePushNotifications(); setPushStatus('Notifications enabled ✅'); }
    catch (e) { setPushStatus(e.message); }
  }

  async function turnOffPush() {
    await disablePushNotifications();
    setPushStatus('Notifications turned off.');
  }

  if (me) {
    const completenessChecks = [avatarUrl, me.handle, me.league, (me.tags || []).length > 0, me.gender];
    const completenessPct = Math.round((completenessChecks.filter(Boolean).length / completenessChecks.length) * 100);
    return (
      <form className="card" onSubmit={save} onKeyDown={focusNext}>
        <h2>My Profile</h2>
        {completenessPct < 100 && (
          <div style={{ marginBottom: 14 }}>
            <div className="dim" style={{ marginBottom: 4 }}>Profile {completenessPct}% complete</div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-raised)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completenessPct}%`, background: 'var(--gold)', transition: 'width .3s' }} />
            </div>
          </div>
        )}
        <AvatarUploader me={{ ...me, avatar_url: avatarUrl }} onUploaded={setAvatarUrl} />
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Nickname</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>Handle</label><input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="e.g. miachen.live (no @ needed)" />
            <div className="dim">No need to include the @ — just the handle itself.</div>
          </div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Diamonds (30d)</label>
            <DiamondInput value={form.diamonds} onChange={(v) => setForm({ ...form, diamonds: v })} />
          </div>
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
        <div className="field" style={{ maxWidth: 220 }}><label>Gender (optional)</label>
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className="field">
          <label>Battle types you do</label>
          <div className="row">
            {BATTLE_TYPES.map((t) => (
              <label key={t.key} className="chip">
                <input type="checkbox" checked={form.tags.includes(t.key)} onChange={() => toggleTag(t.key)} /> {t.label}
              </label>
            ))}
          </div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Current PIN (required to set a new one)</label>
            <PasswordField value={form.currentPin || ''} onChange={(e) => setForm({ ...form, currentPin: e.target.value })} placeholder="Current PIN" />
          </div>
          <div className="field" style={{ flex: 1 }}><label>New PIN (leave blank to keep current)</label>
            <PasswordField value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} maxLength={20} placeholder="New PIN" />
          </div>
        </div>
        {saveError && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{saveError}</p>}
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <div className="row">
            <button className="btn ghost" type="button" onClick={turnOnPush}>🔔 Enable push notifications</button>
            <button className="btn ghost" type="button" onClick={turnOffPush}>🔕 Turn off notifications</button>
          </div>
          <button className="btn" type="submit">Save changes</button>
        </div>
        {pushStatus && <p className="dim" style={{ marginTop: 8 }}>{pushStatus}</p>}
      </form>
    );
  }

  return <LoggedOutView creators={creators} agencyId={agencyId} onCreate={onCreate} onLogin={onLogin} />;
}

function LoggedOutView({ creators, agencyId, onCreate, onLogin }) {
  const rememberedHandle = typeof window !== 'undefined' ? localStorage.getItem(`battleroom-last-handle-${agencyId}`) : null;
  const [mode, setMode] = useState(rememberedHandle ? 'signin' : 'create');
  const [signIn, setSignIn] = useState({ identifier: rememberedHandle || '', pin: '' });
  const [signInError, setSignInError] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', handle: '', diamonds: 0, league: '', tz: 'ET', tags: [], gender: '', pin: '' });
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [ageAttested, setAgeAttested] = useState(false);

  function toggleTag(key) {
    setCreateForm((f) => ({ ...f, tags: f.tags.includes(key) ? f.tags.filter((t) => t !== key) : [...f.tags, key] }));
  }

  async function submitSignIn(e) {
    if (e) e.preventDefault();
    setSignInError('');
    if (!signIn.identifier || !signIn.pin) { setSignInError('Enter your handle/nickname and PIN.'); return; }
    const err = await onLogin(signIn.identifier, signIn.pin);
    if (err) setSignInError(err);
  }

  if (mode === 'signin') {
    return (
      <div className="card">
        <h2>Sign In</h2>
        <p className="dim">Enter your nickname or handle and your PIN. This browser will remember you for 30 days after you sign in.</p>
        <form onKeyDown={focusNext} onSubmit={submitSignIn}>
          <div className="field"><label>Nickname or Handle</label><input value={signIn.identifier} onChange={(e) => setSignIn({ ...signIn, identifier: e.target.value })} autoFocus /></div>
          <div className="field"><label>PIN</label>
            <PasswordField value={signIn.pin} onChange={(e) => setSignIn({ ...signIn, pin: e.target.value })} placeholder="PIN" />
          </div>
          {signInError && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{signInError}</p>}
          <button className="btn" type="submit">Sign In</button>
        </form>
        <p className="dim" style={{ marginTop: 14 }}>
          New here? <a href="#" onClick={(e) => { e.preventDefault(); setMode('create'); }} style={{ color: 'var(--cyan)' }}>Create a profile</a>
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Create a new profile</h2>
        <a href="#" onClick={(e) => { e.preventDefault(); setMode('signin'); }} style={{ color: 'var(--cyan)', fontSize: 13, whiteSpace: 'nowrap' }}>
          Already have an account? Sign in here
        </a>
      </div>
      <p className="dim" style={{ marginTop: 6 }}>Once you create your profile, this browser will remember you for 30 days.</p>
      <form onKeyDown={focusNext} onSubmit={(e) => { e.preventDefault(); if (!createForm.name || !createForm.pin) { alert('Nickname and PIN are required.'); return; } if (!ageAttested) { alert('Please confirm you are 18 or older to continue.'); return; } onCreate({ ...createForm, ageAttested }, pendingAvatarFile); }}>
        <div className="field">
          <label>Profile picture (optional)</label>
          <div className="row" style={{ alignItems: 'center' }}>
            <Avatar url={pendingAvatarFile ? URL.createObjectURL(pendingAvatarFile) : null} name={createForm.name} size={48} />
            <label className="btn ghost" style={{ cursor: 'pointer' }}>
              {pendingAvatarFile ? 'Change photo' : 'Choose photo'}
              <input type="file" accept="image/*" onChange={(e) => setPendingAvatarFile(e.target.files[0] || null)} style={{ display: 'none' }} />
            </label>
          </div>
          <div className="dim">If you skip this, your nickname's first letter is used instead.</div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Nickname</label><input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>Handle</label><input value={createForm.handle} onChange={(e) => setCreateForm({ ...createForm, handle: e.target.value })} placeholder="e.g. miachen.live (no @ needed)" />
            <div className="dim">No need to include the @ — just the handle itself.</div>
          </div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Diamonds (30d)</label>
            <DiamondInput value={createForm.diamonds} onChange={(v) => setCreateForm({ ...createForm, diamonds: v })} />
          </div>
          <div className="field" style={{ flex: 1 }}><label>League</label>
            <select value={createForm.league} onChange={(e) => setCreateForm({ ...createForm, league: e.target.value })}>
              <option value="">Select…</option>
              {LEAGUE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}><label>Timezone</label>
            <select value={createForm.tz} onChange={(e) => setCreateForm({ ...createForm, tz: e.target.value })}>
              {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field" style={{ maxWidth: 220 }}><label>Gender (optional)</label>
          <select value={createForm.gender} onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className="field">
          <label>Battle types you do</label>
          <div className="row">
            {BATTLE_TYPES.map((t) => (
              <label key={t.key} className="chip">
                <input type="checkbox" checked={createForm.tags.includes(t.key)} onChange={() => toggleTag(t.key)} /> {t.label}
              </label>
            ))}
          </div>
        </div>
        <div className="field"><label>Set a PIN (6+ characters)</label>
          <PasswordField value={createForm.pin} onChange={(e) => setCreateForm({ ...createForm, pin: e.target.value })} minLength={6} placeholder="Choose a PIN" />
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '10px 0' }}>
          <input type="checkbox" checked={ageAttested} onChange={(e) => setAgeAttested(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span className="dim" style={{ fontSize: 12 }}>I confirm I am 18 years of age or older. This platform is for adults only.</span>
        </label>
        <button className="btn" type="submit" disabled={!ageAttested}>Create Profile &amp; Continue</button>
      </form>
    </div>
  );
}

function OpponentsStep({ me, creators, onPropose }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('match');
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`battleroom-favorites-${me.id}`) || '[]')); }
    catch (e) { return new Set(); }
  });

  function toggleFavorite(id) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(`battleroom-favorites-${me.id}`, JSON.stringify([...next]));
      return next;
    });
  }

  const q = search.trim().toLowerCase();
  const others = creators.filter((c) => c.id !== me.id && (!q || c.name.toLowerCase().includes(q) || (c.handle || '').toLowerCase().includes(q)));

  const scored = others.map((s) => {
    const diamondDiff = Math.abs((s.diamonds || 0) - (me.diamonds || 0));
    const tzPenalty = s.tz === me.tz ? 0 : 5000;
    const favoriteBonus = favorites.has(s.id) ? -1000000 : 0; // favorites always float to the top
    return { s, score: diamondDiff + tzPenalty + favoriteBonus };
  });

  if (sortBy === 'match') scored.sort((a, b) => a.score - b.score);
  else if (sortBy === 'diamonds') scored.sort((a, b) => (favorites.has(b.s.id) - favorites.has(a.s.id)) || (b.s.diamonds || 0) - (a.s.diamonds || 0));
  else if (sortBy === 'league') scored.sort((a, b) => (favorites.has(b.s.id) - favorites.has(a.s.id)) || (a.s.league || '').localeCompare(b.s.league || ''));
  else if (sortBy === 'name') scored.sort((a, b) => (favorites.has(b.s.id) - favorites.has(a.s.id)) || a.s.name.localeCompare(b.s.name));

  const isRecentlyActive = (s) => s.last_active_at && (Date.now() - new Date(s.last_active_at).getTime()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar url={me.avatar_url} name={me.name} size={36} />
        <div><b>You:</b> {me.name} · {(me.diamonds || 0).toLocaleString()} 💎 · {me.league || '—'} · {tzLabel(me.tz)}</div>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or handle…" style={{ flex: 2, minWidth: 160 }} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ flex: 1, minWidth: 140 }}>
          <option value="match">Best Match</option>
          <option value="diamonds">Diamonds (highest)</option>
          <option value="league">League</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>
      {scored.length === 0 && <div className="empty">No creators match your search.</div>}
      <div className="opp-grid">
        {scored.map(({ s }) => (
          <div key={s.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar url={s.avatar_url} name={s.name} size={40} />
                <div>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div className="dim">{s.handle}</div>
                </div>
              </div>
              <button
                onClick={() => toggleFavorite(s.id)}
                title={favorites.has(s.id) ? 'Remove favorite' : 'Add favorite'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 0, minHeight: 0, color: favorites.has(s.id) ? 'var(--gold)' : 'var(--text-dim)' }}
              >
                {favorites.has(s.id) ? '★' : '☆'}
              </button>
            </div>
            <div style={{ marginTop: 8 }}>{(s.diamonds || 0).toLocaleString()} 💎</div>
            <div className="dim">{s.league || '—'} · {tzLabel(s.tz)}</div>
            {isRecentlyActive(s) && <div className="badge" style={{ borderColor: 'var(--green)', color: 'var(--green)', display: 'inline-block', marginTop: 4 }}>Active recently</div>}
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
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  async function load() {
    setLoadError('');
    try {
      const res = await fetch('/api/posts', { headers: { 'X-Session-Role': 'creator' } });
      if (res.ok) { setPosts(await res.json()); }
      else { const d = await res.json(); setLoadError(d.error || 'Could not load posts.'); }
    } catch (e) { setLoadError('Network error loading posts.'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function post(e) {
    if (e) e.preventDefault();
    setError('');
    if (!message.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Role': 'creator' }, body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not post.'); setPosting(false); return; }
      // Show it immediately instead of waiting on a full reload — fixes the
      // "nothing shows up after posting" issue by not depending on a second
      // round trip succeeding to render anything.
      setPosts((prev) => [{ ...data, creators: { name: me.name, handle: me.handle }, reported: false }, ...prev]);
      setMessage('');
      load(); // reconcile with the server in the background
    } catch (err) {
      setError('Network error — please try again.');
    }
    setPosting(false);
  }

  async function remove(id) {
    setPosts((prev) => prev.filter((p) => p.id !== id)); // optimistic
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    load();
  }

  async function report(id) {
    if (!confirm('Report this post to your agency admin?')) return;
    await fetch(`/api/posts/${id}`, { method: 'PATCH' });
    alert('Reported.');
    load();
  }

  return (
    <div>
      <form className="card" onSubmit={post}>
        <h2>Find a Battle</h2>
        <p className="dim">Post what you're looking for — like an LFG board. Anyone in your agency can see it, and only you (or an admin) can delete your post.</p>
        <div className="field"><label>Your post</label><input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} placeholder="e.g. Looking for a chill battle tonight around 8pm ET" /></div>
        {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
        <button className="btn" type="submit" disabled={posting}>{posting ? 'Posting…' : 'Post'}</button>
      </form>
      {loadError && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{loadError}</p>}
      {loading ? <SkeletonList count={3} /> : posts.length === 0 ? <p className="dim">No posts yet — be the first.</p> : posts.map((p) => (
        <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Avatar url={p.creators?.avatar_url} name={p.creators ? p.creators.name : '?'} size={32} />
            <div>
              <b>{p.creators ? p.creators.name : 'Someone'}</b>
              <span className="dim"> · {new Date(p.created_at).toLocaleString()}</span>
              {p.reported && <span className="badge" style={{ marginLeft: 6, borderColor: 'var(--pink)', color: 'var(--pink)' }}>Reported</span>}
              <p style={{ margin: '6px 0 0' }}>{p.message}</p>
            </div>
          </div>
          <div className="row" style={{ flexShrink: 0 }}>
            {p.creator_id !== me.id && !p.reported && <button className="btn ghost" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => report(p.id)}>Report</button>}
            {p.creator_id === me.id && <button className="btn ghost" style={{ borderColor: 'var(--pink)', color: 'var(--pink)' }} onClick={() => remove(p.id)}>Delete</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function NeedsResponseCard({ b, me, nameOf, handleOf, onRespond, onRebuttal }) {
  const [rebutting, setRebutting] = useState(false);
  const [datetime, setDatetime] = useState('');
  const [tz, setTz] = useState(me.tz);
  const opponentId = b.creator_a === me.id ? b.creator_b : b.creator_a;

  return (
    <div className="vs">
      <div className="side">{nameOf(b.creator_a)}<div className="dim">{handleOf(b.creator_a)}</div></div>
      <div className="mid">VS</div>
      <div className="side b">{nameOf(b.creator_b)}<div className="dim">{handleOf(b.creator_b)}</div></div>
      <div className="vs-actions">
        {!rebutting ? (
          <div className="row">
            <button className="btn ghost" onClick={() => onRespond(b.id, 'decline')}>Decline</button>
            <button className="btn ghost" onClick={() => setRebutting(true)}>Propose different time</button>
            <button className="btn" onClick={() => onRespond(b.id, 'accept')}>Accept</button>
          </div>
        ) : (
          <div>
            <div className="field"><label>New date &amp; time</label>
              <DateTimePicker value={datetime} onChange={setDatetime} />
            </div>
            <div className="field" style={{ maxWidth: 220 }}><label>Timezone</label>
              <select value={tz} onChange={(e) => setTz(e.target.value)}>
                {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
              </select>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn ghost" onClick={() => setRebutting(false)}>Cancel</button>
              <button className="btn" onClick={() => onRebuttal(b, opponentId, datetime, tz)}>Send Counter-Offer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function exportBattlesCSV(battles, nameOf) {
  const header = ['Creator A', 'Creator B', 'Date/Time (UTC)', 'Notes'];
  const rows = battles.map((b) => [nameOf(b.creator_a), nameOf(b.creator_b), new Date(b.datetime_utc).toLocaleString(), b.notes || '']);
  const escapeCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'battle-schedule.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function BattlesStep({ me, creators, battles, onChange, onFindOpponent }) {
  const [form, setForm] = useState({ opponent: '', datetime: '', tz: me.tz, notes: '' });
  const nameOf = (id) => creators.find((c) => c.id === id)?.name || 'Unknown';
  const handleOf = (id) => creators.find((c) => c.id === id)?.handle || '';
  const [optimisticPatches, setOptimisticPatches] = useState({}); // id -> partial patch
  const [optimisticRemovals, setOptimisticRemovals] = useState(new Set());

  const visibleBattles = battles
    .filter((b) => !optimisticRemovals.has(b.id))
    .map((b) => (optimisticPatches[b.id] ? { ...b, ...optimisticPatches[b.id] } : b));

  const mine = visibleBattles.filter((b) => b.creator_a === me.id || b.creator_b === me.id);
  const needsResponse = mine.filter((b) => !b.declined && ((b.creator_a === me.id && !b.accepted_a) || (b.creator_b === me.id && !b.accepted_b)));
  const waiting = mine.filter((b) => !b.declined && !needsResponse.includes(b) && !(b.accepted_a && b.accepted_b));
  const confirmed = mine.filter((b) => !b.declined && b.accepted_a && b.accepted_b);
  const now = new Date();
  const upcomingConfirmed = confirmed.filter((b) => new Date(b.datetime_utc) >= now).sort((a, b) => new Date(a.datetime_utc) - new Date(b.datetime_utc));
  const pastConfirmed = confirmed.filter((b) => new Date(b.datetime_utc) < now).sort((a, b) => new Date(b.datetime_utc) - new Date(a.datetime_utc));

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
    const patch = action === 'accept'
      ? (battles.find((b) => b.id === id)?.creator_a === me.id ? { accepted_a: true } : { accepted_b: true })
      : { declined: true };
    setOptimisticPatches((prev) => ({ ...prev, [id]: patch })); // optimistic
    const res = await fetch(`/api/battles/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    if (!res.ok) setOptimisticPatches((prev) => { const next = { ...prev }; delete next[id]; return next; }); // revert
    onChange();
  }
  async function remove(id) {
    setOptimisticRemovals((prev) => new Set(prev).add(id)); // optimistic
    const res = await fetch(`/api/battles/${id}`, { method: 'DELETE' });
    if (!res.ok) setOptimisticRemovals((prev) => { const next = new Set(prev); next.delete(id); return next; }); // revert
    onChange();
  }

  async function sendRebuttal(originalBattle, opponentId, datetime, tz) {
    if (!datetime) { alert('Pick a time first.'); return; }
    // Decline the original, then send a fresh invite back the other way
    // with the new proposed time — a "counter-offer" instead of a flat no.
    await fetch(`/api/battles/${originalBattle.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'decline' }) });
    const res = await fetch('/api/battles', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorA: me.id, creatorB: opponentId, localDateTime: datetime, zoneCode: tz, notes: 'Rebuttal — proposed a different time' })
    });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Could not send rebuttal.'); }
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
          <div className="field" style={{ flex: 1 }}><label>Time zone for this time</label>
            <select value={form.tz} onChange={(e) => setForm({ ...form, tz: e.target.value })}>
              {ZONES.map((z) => <option key={z.code} value={z.code}>{z.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Date &amp; Time (your local time)</label>
          <DateTimePicker value={form.datetime} onChange={(v) => setForm({ ...form, datetime: v })} />
        </div>
        <button className="btn" type="submit">Send Invite</button>
      </form>

      {needsResponse.length > 0 && <h3>Needs Your Response</h3>}
      {needsResponse.map((b) => (
        <NeedsResponseCard key={b.id} b={b} me={me} nameOf={nameOf} handleOf={handleOf} onRespond={respond} onRebuttal={sendRebuttal} />
      ))}

      {waiting.length > 0 && <h3>Waiting on a Response</h3>}
      {waiting.map((b) => (
        <div key={b.id} className="vs">
          <div className="side">{nameOf(b.creator_a)}<br /><a className="dim" href={tiktokUrl(handleOf(b.creator_a))} target="_blank" rel="noopener noreferrer">TikTok ↗</a></div>
          <div className="mid">VS</div>
          <div className="side b">{nameOf(b.creator_b)}<br /><a className="dim" href={tiktokUrl(handleOf(b.creator_b))} target="_blank" rel="noopener noreferrer">TikTok ↗</a></div>
          <div className="vs-actions"><button className="btn ghost" onClick={() => remove(b.id)}>Cancel invite</button></div>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0 }}>Your Calendar</h3>
        {upcomingConfirmed.length > 0 && (
          <div className="row">
            <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => exportBattlesCSV(upcomingConfirmed, nameOf)}>⬇ Export CSV</button>
          </div>
        )}
      </div>
      {upcomingConfirmed.length === 0 && (
        <div className="empty" style={{ border: '1px dashed var(--line)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
          <p className="dim" style={{ margin: 0 }}>No upcoming battles yet.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
            <button className="btn ghost" onClick={onFindOpponent}>Find an Opponent</button>
          </div>
        </div>
      )}
      {upcomingConfirmed.map((b) => (
        <div key={b.id} className="vs">
          <div className="side">{nameOf(b.creator_a)}<br /><a className="dim" href={tiktokUrl(handleOf(b.creator_a))} target="_blank" rel="noopener noreferrer">TikTok ↗</a></div>
          <div className="mid">VS</div>
          <div className="side b">{nameOf(b.creator_b)}<br /><a className="dim" href={tiktokUrl(handleOf(b.creator_b))} target="_blank" rel="noopener noreferrer">TikTok ↗</a></div>
          <div className="vs-actions">
            <div className="dim">{new Date(b.datetime_utc).toLocaleString()}</div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => downloadICS({
                id: b.id, title: `${nameOf(b.creator_a)} vs ${nameOf(b.creator_b)} — Live Battle`, notes: b.notes, startUTC: b.datetime_utc
              })}>＋ Add to Calendar</button>
              <a className="btn ghost" style={{ fontSize: 12, padding: '6px 10px', textDecoration: 'none', display: 'inline-block' }} target="_blank" rel="noopener noreferrer"
                href={googleCalendarUrl({ title: `${nameOf(b.creator_a)} vs ${nameOf(b.creator_b)} — Live Battle`, notes: b.notes, startUTC: b.datetime_utc })}>
                ＋ Google Calendar
              </a>
              <button className="btn ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => shareOrDownloadBattleCard({
                nameA: nameOf(b.creator_a), nameB: nameOf(b.creator_b),
                dateStr: new Date(b.datetime_utc).toLocaleDateString(), timeStr: new Date(b.datetime_utc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              })}>📤 Share</button>
              <button className="btn ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => remove(b.id)}>Remove</button>
            </div>
          </div>
        </div>
      ))}

      {pastConfirmed.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Past Battles</h3>
          {pastConfirmed.map((b) => (
            <div key={b.id} className="vs" style={{ opacity: 0.75 }}>
              <div className="side">{nameOf(b.creator_a)}<br /><a className="dim" href={tiktokUrl(handleOf(b.creator_a))} target="_blank" rel="noopener noreferrer">TikTok ↗</a></div>
              <div className="mid">VS</div>
              <div className="side b">{nameOf(b.creator_b)}<br /><a className="dim" href={tiktokUrl(handleOf(b.creator_b))} target="_blank" rel="noopener noreferrer">TikTok ↗</a></div>
              <div className="vs-actions">
                <div className="dim">{new Date(b.datetime_utc).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
