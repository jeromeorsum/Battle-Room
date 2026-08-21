import Head from 'next/head';
import { useEffect, useState } from 'react';
import { ZONES, BATTLE_TYPES, LEAGUE_OPTIONS, zoneByCode } from '../lib/constants';
import { PRICING_TIERS } from '../lib/pricing';
import Avatar from '../components/Avatar';
import PasswordField from '../components/PasswordField';
import DateTimePicker from '../components/DateTimePicker';
import DiamondInput from '../components/DiamondInput';
import { SkeletonList } from '../components/Skeleton';
import { toast, confirmModal } from '../components/Notify';

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
  const [filters, setFilters] = useState({ min: '', max: '', type: 'all', search: '' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [bulkTagKey, setBulkTagKey] = useState('');
  const [battleFilter, setBattleFilter] = useState('all');
  const [bookForm, setBookForm] = useState({ a: '', b: '', datetime: '', tz: 'ET', notes: '' });
  const [addForm, setAddForm] = useState({ name: '', handle: '', diamonds: 0, league: '', tz: 'ET', tags: [], pin: '' });
  const [addAgeAttested, setAddAgeAttested] = useState(false);
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
  const [referralCopied, setReferralCopied] = useState(false);
  const [invites, setInvites] = useState([]);
  const [creatorInviteForm, setCreatorInviteForm] = useState({ count: 1, label: '' });
  const [creatorInviteMsg, setCreatorInviteMsg] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [accentMsg, setAccentMsg] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotForm, setForgotForm] = useState({ agencyCode: '', contactEmail: '' });
  const [forgotMsg, setForgotMsg] = useState('');

  const [loginMode, setLoginMode] = useState('code'); // 'code' | 'email'
  const [emailLogin, setEmailLogin] = useState({ agencyCode: '', email: '', password: '', remember: false });
  const [needs2fa, setNeeds2fa] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [forgotPwOpen, setForgotPwOpen] = useState(false);
  const [forgotPwMsg, setForgotPwMsg] = useState('');

  const [showConvert, setShowConvert] = useState(false);
  const [convertForm, setConvertForm] = useState({ email: '', password: '' });
  const [convertMsg, setConvertMsg] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteConfirmCode, setDeleteConfirmCode] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');

  async function deleteAgency() {
    setDeleteMsg('');
    try {
      const res = await fetch('/api/agency-delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: deleteConfirmName, confirmCode: deleteConfirmCode })
      });
      const data = await res.json();
      if (!res.ok) { setDeleteMsg(data.error || 'Could not delete.'); return; }
      window.location.href = '/';
    } catch (e) { setDeleteMsg('Network error — try again.'); }
  }

  async function resendVerification() {
    setVerifyMsg('Sending…');
    try {
      const res = await fetch('/api/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setVerifyMsg(data.error || 'Could not send.'); return; }
      setVerifyMsg(data.alreadyVerified ? 'Already verified.' : 'Sent — check your inbox.');
    } catch (e) { setVerifyMsg('Network error — try again.'); }
  }

  const [team, setTeam] = useState([]);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'manager' });
  const [inviteMsg, setInviteMsg] = useState('');
  const [my2fa, setMy2fa] = useState(null); // { qrDataUrl, secret } while setting up
  const [twoFaConfirmCode, setTwoFaConfirmCode] = useState('');
  const [twoFaMsg, setTwoFaMsg] = useState('');
  const [disable2faPassword, setDisable2faPassword] = useState('');

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

  async function submitEmailLogin(e) {
    if (e) e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/agency-users/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailLogin)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed.'); return; }
      if (data.requires2fa) { setNeeds2fa(true); return; }
      const sessRes = await fetch('/api/admin-session');
      if (sessRes.ok) { const d = await sessRes.json(); setAgency(d); setAccentColor(d.accent_color || ''); await loadRoster(); }
    } catch (e) { setError('Network error — try again.'); }
  }

  async function submit2fa(e) {
    if (e) e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/agency-users/verify-2fa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: twoFaCode })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Incorrect code.'); return; }
      setNeeds2fa(false); setTwoFaCode('');
      const sessRes = await fetch('/api/admin-session');
      if (sessRes.ok) { const d = await sessRes.json(); setAgency(d); setAccentColor(d.accent_color || ''); await loadRoster(); }
    } catch (e) { setError('Network error — try again.'); }
  }

  async function submitForgotPassword() {
    setForgotPwMsg('Sending…');
    try {
      const res = await fetch('/api/agency-users/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyCode: emailLogin.agencyCode, email: emailLogin.email })
      });
      const data = await res.json();
      setForgotPwMsg(data.message || 'Check your email.');
    } catch (e) { setForgotPwMsg('Network error — try again.'); }
  }

  async function submitConvert(e) {
    if (e) e.preventDefault();
    setConvertMsg('');
    try {
      const res = await fetch('/api/agency-users/convert', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(convertForm)
      });
      const data = await res.json();
      if (!res.ok) { setConvertMsg(data.error || 'Could not set up your account.'); return; }
      setShowConvert(false);
      setAgency((a) => ({ ...a, suggestConvert: false, agencyUserId: 'self', email: data.email }));
      loadTeam();
    } catch (e) { setConvertMsg('Network error — try again.'); }
  }

  async function loadTeam() {
    const res = await fetch('/api/agency-users');
    if (res.ok) setTeam(await res.json());
  }

  async function inviteTeamMember(e) {
    if (e) e.preventDefault();
    setInviteMsg('Sending…');
    try {
      const res = await fetch('/api/agency-users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inviteForm)
      });
      const data = await res.json();
      if (!res.ok) { setInviteMsg(data.error || 'Could not send invite.'); return; }
      setInviteMsg(`Invite sent to ${data.invited}.`);
      setInviteForm({ email: '', role: 'manager' });
      loadTeam();
    } catch (e) { setInviteMsg('Network error — try again.'); }
  }

  async function removeTeamMember(id) {
    if (!(await confirmModal('Remove this team member\u2019s access?'))) return;
    const res = await fetch(`/api/agency-users/${id}`, { method: 'DELETE' });
    if (res.ok) loadTeam(); else { const d = await res.json(); toast(d.error || 'Could not remove.', 'error'); }
  }

  async function start2faSetup() {
    setTwoFaMsg('');
    const res = await fetch('/api/agency-users/2fa-setup', { method: 'POST' });
    const data = await res.json();
    if (res.ok) setMy2fa(data); else setTwoFaMsg(data.error || 'Could not start 2FA setup.');
  }

  async function confirm2faSetup() {
    setTwoFaMsg('');
    const res = await fetch('/api/agency-users/2fa-confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: twoFaConfirmCode })
    });
    const data = await res.json();
    if (!res.ok) { setTwoFaMsg(data.error || 'Incorrect code.'); return; }
    setMy2fa(null); setTwoFaConfirmCode(''); setTwoFaMsg('Two-factor authentication is now on for your account.');
    loadTeam();
  }

  async function disable2fa() {
    setTwoFaMsg('');
    const res = await fetch('/api/agency-users/2fa-disable', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: disable2faPassword })
    });
    const data = await res.json();
    if (!res.ok) { setTwoFaMsg(data.error || 'Could not disable 2FA.'); return; }
    setDisable2faPassword(''); setTwoFaMsg('Two-factor authentication turned off.');
    loadTeam();
  }

  async function loadRoster() {
    try {
      const adminHeader = { headers: { 'X-Session-Role': 'admin' } };
      const [cRes, bRes, pRes, aRes] = await Promise.all([fetch('/api/creators', adminHeader), fetch('/api/battles', adminHeader), fetch('/api/posts', adminHeader), fetch('/api/admin/audit-log')]);
      if (cRes.ok) setCreators(await cRes.json());
      if (bRes.ok) setBattles(await bRes.json());
      if (pRes.ok) setPosts(await pRes.json());
      if (aRes.ok) setAuditLog(await aRes.json());
    } catch (e) { console.error('loadRoster failed', e); }
  }

  async function loadInvites() {
    try {
      const res = await fetch('/api/invites');
      if (res.ok) { const d = await res.json(); setInvites(d.invites || []); }
    } catch (e) { console.error('loadInvites failed', e); }
  }

  async function generateInvites(e) {
    if (e) e.preventDefault();
    setCreatorInviteMsg(''); setInviteBusy(true);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: Number(creatorInviteForm.count) || 1, label: creatorInviteForm.label })
      });
      const d = await res.json();
      if (!res.ok) { setCreatorInviteMsg(d.error || 'Could not generate invites.'); setInviteBusy(false); return; }
      setCreatorInviteForm({ count: 1, label: '' });
      await loadInvites();
      toast(`${d.invites.length} invite code${d.invites.length > 1 ? 's' : ''} created.`);
    } catch (err) {
      setCreatorInviteMsg('Could not reach the server — try again.');
    } finally { setInviteBusy(false); }
  }

  async function revokeInvite(id) {
    const ok = await confirmModal('Revoke this invite? The code will stop working.');
    if (!ok) return;
    const res = await fetch(`/api/invites/${id}`, { method: 'DELETE' });
    if (res.ok) { loadInvites(); toast('Invite revoked.'); }
    else { const d = await res.json().catch(() => ({})); toast(d.error || 'Could not revoke.', 'error'); }
  }

  function copyInvite(code) {
    const link = `${window.location.origin}/app?invite=${code}`;
    navigator.clipboard.writeText(link);
    toast('Invite link copied — send it to your creator.');
  }

  async function toggleSharedCode(next) {
    const res = await fetch('/api/admin/shared-code-toggle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allow: next })
    });
    if (res.ok) { setAgency((a) => ({ ...a, allow_shared_code: next })); toast(next ? 'Shared agency code enabled.' : 'Shared code off — invites only.'); }
    else { const d = await res.json().catch(() => ({})); toast(d.error || 'Could not update.', 'error'); }
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

  useEffect(() => {
    if (agency?.suggestConvert) setShowConvert(true);
  }, [agency?.suggestConvert]);

  useEffect(() => {
    if (agency?.id && adminTab === 'settings' && agency.role !== 'manager') loadTeam();
    if (agency?.id && adminTab === 'dashboard') loadInvites();
  }, [agency?.id, adminTab]);

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
    if (!(await confirmModal(`Remove ${selectedIds.size} creator(s) from the roster? This can't be undone.`))) return;
    const previous = creators;
    setCreators((prev) => prev.filter((c) => !selectedIds.has(c.id))); // optimistic
    const results = await Promise.all([...selectedIds].map((id) => fetch(`/api/creators/${id}`, { method: 'DELETE' })));
    if (results.some((r) => !r.ok)) { setCreators(previous); toast('Some removals failed — please try again.', 'error'); }
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
    if (!(await confirmModal(`Remove ${name} from the roster? This can't be undone.`))) return;
    const previous = creators;
    setCreators((prev) => prev.filter((c) => c.id !== id)); // optimistic
    const res = await fetch(`/api/creators/${id}`, { method: 'DELETE' });
    if (!res.ok) { setCreators(previous); toast('Could not remove creator.', 'error'); return; }
    loadRoster();
  }

  async function resetCreatorPin(id, name) {
    const newPin = prompt(`Set a new temporary PIN for ${name} (6+ characters). Tell them this PIN so they can log in and change it themselves.`);
    if (!newPin) return;
    if (newPin.length < 6) { toast('PIN must be at least 6 characters.', 'error'); return; }
    const creator = creators.find((c) => c.id === id);
    const res = await fetch(`/api/creators/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: creator.name, handle: creator.handle, diamonds: creator.diamonds, league: creator.league, tz: creator.tz, tags: creator.tags, pin: newPin })
    });
    if (res.ok) toast(`New PIN set for ${name}.`); else toast('Could not reset PIN.', 'error');
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
    if (!addAgeAttested) { setAddError('Please confirm this creator is 18 or older.'); return; }
    const res = await fetch('/api/creators', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Role': 'admin' }, body: JSON.stringify({ ...addForm, ageAttested: true })
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error || 'Could not add creator.'); return; }
    setAddForm({ name: '', handle: '', diamonds: 0, league: '', tz: 'ET', tags: [], pin: '' });
    setAddAgeAttested(false);
    loadRoster();
  }

  async function bookBattle(e) {
    if (e) e.preventDefault();
    if (!bookForm.a || !bookForm.b || bookForm.a === bookForm.b || !bookForm.datetime) { toast('Pick two different creators and a time.', 'error'); return; }
    const res = await fetch('/api/battles', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorA: bookForm.a, creatorB: bookForm.b, localDateTime: bookForm.datetime, zoneCode: bookForm.tz, notes: bookForm.notes })
    });
    if (res.ok) { loadRoster(); setBookForm({ a: '', b: '', datetime: '', tz: 'ET', notes: '' }); }
    else { const d = await res.json(); toast(d.error || 'Could not book battle.', 'error'); }
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
      if (!res.ok) { toast(data.error || 'Could not send verification code.', 'error'); setPendingBilling(null); setBillingLoading(false); return; }
      setBillingCodeSent(true);
    } catch (e) { toast('Network error.', 'error'); setPendingBilling(null); }
    setBillingLoading(false);
  }

  async function confirmBilling() {
    if (!pendingBilling || !billingCode) return;
    setBillingLoading(true);
    try {
      const endpoint = pendingBilling.type === 'checkout' ? '/api/checkout' : '/api/create-portal-session';
      const body = pendingBilling.type === 'checkout'
        ? { planTier: pendingBilling.planTier, billingPeriod: pendingBilling.billingPeriod, verificationCode: billingCode }
        : { verificationCode: billingCode };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      let data;
      try { data = await res.json(); }
      catch (parseErr) { toast('The server sent back an unexpected response. This usually means Stripe isn\u2019t connected yet.', 'error'); setBillingLoading(false); return; }
      if (!res.ok) { toast(data.error || 'Could not continue.', 'error'); setBillingLoading(false); return; }
      window.location.href = data.url;
    } catch (e) { toast('Could not reach the server — check your internet connection and try again.', 'error'); setBillingLoading(false); }
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

  const referralLink = agency?.referral_code && typeof window !== 'undefined'
    ? `${window.location.origin}/signup?ref=${agency.referral_code}` : '';

  function copyReferralLink() {
    navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  }

  async function shareReferralLink() {
    const text = `Join Battle Room using my referral code ${agency.referral_code}: ${referralLink}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Battle Room', text, url: referralLink }); return; }
      catch (e) { /* user cancelled the share sheet — fall through to copy */ }
    }
    navigator.clipboard.writeText(text);
    toast('Link copied — paste it wherever you\u2019d like to send it.');
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
    if (needs2fa) {
      return (
        <div className="wrap">
          <Head><title>Admin · Battle Room</title></Head>
          <form className="card" style={{ maxWidth: 380, margin: '60px auto' }} onSubmit={submit2fa}>
            <h2>Two-Factor Code</h2>
            <p className="dim">Enter the 6-digit code from your authenticator app.</p>
            <div className="field"><input aria-label="Two-factor authentication code" value={twoFaCode} onChange={(e) => setTwoFaCode(e.target.value)} placeholder="123456" maxLength={6} autoFocus /></div>
            {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
            <button className="btn" type="submit" disabled={twoFaCode.length !== 6}>Verify</button>
          </form>
        </div>
      );
    }

    return (
      <div className="wrap">
        <div className="card" style={{ maxWidth: 380, margin: '60px auto' }}>
          <div className="tabs" style={{ marginBottom: 14 }}>
            <button type="button" className={loginMode === 'code' ? 'active' : ''} onClick={() => { setLoginMode('code'); setError(''); }}>Access Code</button>
            <button type="button" className={loginMode === 'email' ? 'active' : ''} onClick={() => { setLoginMode('email'); setError(''); }}>Email &amp; Password</button>
          </div>

          {loginMode === 'code' ? (
            <form onSubmit={submitLogin} onKeyDown={focusNext}>
              <h2>Agency Login</h2>
              <p className="dim">Enter your agency code and your admin or manager code.</p>
              <div className="field"><label htmlFor="li-agency-code">Agency code</label><input id="li-agency-code" value={codes.agencyCode} onChange={(e) => setCodes({ ...codes, agencyCode: e.target.value.toUpperCase() })} placeholder="e.g. FALCON7X2" /></div>
              <div className="field"><label htmlFor="li-admin-code">Admin code</label>
                <PasswordField id="li-admin-code" value={codes.adminCode} onChange={(e) => setCodes({ ...codes, adminCode: e.target.value })} placeholder="Admin code" />
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
                  <div className="field"><label htmlFor="fg-agency-code">Agency code</label><input id="fg-agency-code" value={forgotForm.agencyCode} onChange={(e) => setForgotForm({ ...forgotForm, agencyCode: e.target.value.toUpperCase() })} /></div>
                  <div className="field"><label htmlFor="fg-contact-email">Contact email on file</label><input id="fg-contact-email" type="email" value={forgotForm.contactEmail} onChange={(e) => setForgotForm({ ...forgotForm, contactEmail: e.target.value })} /></div>
                  {forgotMsg && <p className="dim" style={{ fontSize: 12 }}>{forgotMsg}</p>}
                  <button type="button" className="btn" style={{ width: '100%' }} onClick={submitForgot}>Send Reset Link</button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={submitEmailLogin}>
              <h2>Team Member Login</h2>
              <p className="dim">Sign in with your individual email and password.</p>
              <div className="field"><label htmlFor="el-agency-code">Agency code</label><input id="el-agency-code" value={emailLogin.agencyCode} onChange={(e) => setEmailLogin({ ...emailLogin, agencyCode: e.target.value.toUpperCase() })} placeholder="e.g. FALCON7X2" /></div>
              <div className="field"><label htmlFor="el-email">Email</label><input id="el-email" type="email" value={emailLogin.email} onChange={(e) => setEmailLogin({ ...emailLogin, email: e.target.value })} /></div>
              <div className="field"><label htmlFor="el-password">Password</label>
                <PasswordField id="el-password" value={emailLogin.password} onChange={(e) => setEmailLogin({ ...emailLogin, password: e.target.value })} placeholder="Password" />
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 12px' }}>
                <input type="checkbox" checked={emailLogin.remember} onChange={(e) => setEmailLogin({ ...emailLogin, remember: e.target.checked })} style={{ width: 'auto' }} />
                <span className="dim">Remember me on this device for 30 days</span>
              </label>
              {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
              <button className="btn" type="submit">Sign In</button>
              <button type="button" className="btn ghost" style={{ marginTop: 10, width: '100%' }} onClick={() => { setForgotPwOpen((v) => !v); setForgotPwMsg(''); }}>
                {forgotPwOpen ? 'Hide' : 'Forgot your password?'}
              </button>
              {forgotPwOpen && (
                <div style={{ marginTop: 10 }}>
                  <p className="dim" style={{ fontSize: 12 }}>We'll email a reset link to the address above (using the agency code entered too).</p>
                  {forgotPwMsg && <p className="dim" style={{ fontSize: 12 }}>{forgotPwMsg}</p>}
                  <button type="button" className="btn" style={{ width: '100%' }} onClick={submitForgotPassword}>Send Reset Link</button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  const filtered = creators.filter((c) => {
    if (filters.min !== '' && (c.diamonds || 0) < Number(filters.min)) return false;
    if (filters.max !== '' && (c.diamonds || 0) > Number(filters.max)) return false;
    if (filters.type !== 'all' && !(c.tags || []).includes(filters.type)) return false;
    const s = (filters.search || '').trim().toLowerCase();
    if (s && !c.name.toLowerCase().includes(s) && !(c.handle || '').toLowerCase().includes(s)) return false;
    return true;
  }).sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0));

  const inactive = agency.status === 'past_due' || agency.status === 'canceled';
  const isManager = agency.role === 'manager';
  const trialDaysLeft = agency.status === 'trialing' && agency.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(agency.trial_ends_at) - new Date()) / (24 * 60 * 60 * 1000)))
    : null;

  return (
    <div className="wrap" style={accentColor ? { '--gold': accentColor } : undefined}>
      <Head><title>Admin · Battle Room</title></Head>
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>Admin</h1>
          <div className="dim">{agency.name} · {creators.length}/{agency.max_creators} creators · plan: {agency.plan_tier}{isManager ? ' · logged in as manager' : ''}</div>
          {trialDaysLeft !== null && <div className="dim" style={{ marginTop: 4, color: trialDaysLeft <= 3 ? 'var(--pink)' : 'var(--text-dim)' }}>{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left in your trial</div>}
        </div>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>

      {showConvert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,15,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div className="card" style={{ maxWidth: 420 }}>
            <h2>Secure your account</h2>
            <p className="dim">You're logged in with the shared admin code. Set up your own email &amp; password so your access can't be lost or copied along with the shared code — you can add two-factor authentication afterward too.</p>
            <form onSubmit={submitConvert}>
              <div className="field"><label htmlFor="cv-email">Your email</label><input id="cv-email" type="email" required value={convertForm.email} onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })} /></div>
              <div className="field"><label htmlFor="cv-password">Choose a password (10+ characters)</label>
                <PasswordField id="cv-password" value={convertForm.password} onChange={(e) => setConvertForm({ ...convertForm, password: e.target.value })} />
              </div>
              {convertMsg && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{convertMsg}</p>}
              <button className="btn" type="submit" style={{ width: '100%' }}>Set Up My Account</button>
            </form>
            <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowConvert(false)}>Remind me later</button>
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={adminTab === 'dashboard' ? 'active' : ''} onClick={() => setAdminTab('dashboard')}>Dashboard</button>
        {!isManager && <button className={adminTab === 'settings' ? 'active' : ''} onClick={() => setAdminTab('settings')}>Settings</button>}
        <button className={adminTab === 'activity' ? 'active' : ''} onClick={() => setAdminTab('activity')}>Activity Log</button>
      </div>

      {!isManager && agency.contact_email && !agency.contact_email_verified && (
        <div className="card" style={{ borderColor: 'var(--gold)' }}>
          <b>Your contact email isn't confirmed yet.</b>
          <p className="dim" style={{ margin: '6px 0 10px' }}>
            {agency.contact_email} hasn't clicked the confirmation link we sent. Billing codes, password resets, and invites all go to this address — confirm it so you don't get locked out of something later.
          </p>
          <button className="btn ghost" onClick={resendVerification} disabled={verifyMsg === 'Sending…'}>Resend confirmation email</button>
          {verifyMsg && <p className="dim" style={{ fontSize: 12, marginTop: 6 }}>{verifyMsg}</p>}
        </div>
      )}

      {inactive && (
        <div className="card" style={{ borderColor: 'var(--pink)' }}>
          <b style={{ color: 'var(--pink)' }}>This agency's subscription is {agency.status === 'canceled' ? 'canceled' : 'past due'}.</b>
          <p className="dim" style={{ margin: '6px 0 0' }}>You can still view your existing roster and battles, but adding new people, booking new battles, responding to invites, and posting are all paused until this is resolved. {!isManager && 'Subscribe from the Settings tab to reactivate.'}</p>
        </div>
      )}

      {adminTab === 'dashboard' && (
        <>
          {(() => {
            // Agency insights — computed from already-loaded data (no extra
            // queries). Gives the owner an at-a-glance read on roster and
            // battle health.
            const now = Date.now();
            const confirmed = battles.filter((b) => b.accepted_a && b.accepted_b && !b.declined);
            const upcoming = confirmed.filter((b) => new Date(b.datetime_utc).getTime() >= now);
            const completed = confirmed.filter((b) => new Date(b.datetime_utc).getTime() < now);
            const pending = battles.filter((b) => !b.declined && !(b.accepted_a && b.accepted_b));
            const next7 = upcoming.filter((b) => new Date(b.datetime_utc).getTime() < now + 7 * 24 * 3600 * 1000);
            const completeProfiles = creators.filter((c) => c.handle && c.league && (c.tags || []).length > 0 && c.gender).length;
            const slotsLeft = Math.max(0, (agency?.max_creators || 0) - creators.length);
            const stat = (label, value, sub) => (
              <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gold)', lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{label}</div>
                {sub && <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
              </div>
            );
            if (creators.length === 0 && battles.length === 0) return null; // nothing to show yet
            return (
              <div className="card">
                <h2 style={{ marginTop: 0 }}>At a glance</h2>
                <div className="insights-grid">
                  {stat('Creators', creators.length, slotsLeft > 0 ? `${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left` : 'roster full')}
                  {stat('Complete profiles', `${completeProfiles}/${creators.length || 0}`, 'handle · league · tags · gender')}
                  {stat('Upcoming battles', upcoming.length, next7.length > 0 ? `${next7.length} in the next 7 days` : 'none this week')}
                  {stat('Awaiting response', pending.length, 'proposed, not yet confirmed')}
                  {stat('Completed battles', completed.length, 'already happened')}
                </div>
              </div>
            );
          })()}

          {showOnboarding && (creators.length === 0 || battles.length === 0) && (
            <div className="card" style={{ borderColor: 'var(--gold)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2>👋 Welcome to Battle Room</h2>
                <button className="btn ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setShowOnboarding(false)}>Dismiss</button>
              </div>
              <p className="dim" style={{ marginTop: 0 }}>Let&apos;s get your agency up and running. Here are your first steps:</p>
              {agency.agency_code && (
                <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', margin: '4px 0 12px' }}>
                  <div className="dim" style={{ fontSize: 12, marginBottom: 4 }}>Your agency code — share this so your creators can join</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <code style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: 'var(--gold)' }}>{agency.agency_code}</code>
                    <button className="btn ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { navigator.clipboard.writeText(agency.agency_code); toast('Agency code copied — send it to your creators.', 'success'); }}>Copy</button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="dim">{creators.length > 0 ? '✅' : '1️⃣'} Add your first creator — use the form below, or share the agency code above so they can sign themselves up</div>
                <div className="dim">{battles.length > 0 ? '✅' : '2️⃣'} Book your first battle, or wait for a creator to send an invite</div>
                <div className="dim">3️⃣ Save your agency code and admin code somewhere safe — there&apos;s no automatic recovery for the agency code itself</div>
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
              <div className="field" style={{ flex: 1 }}><label>Handle</label><input value={addForm.handle} onChange={(e) => setAddForm({ ...addForm, handle: e.target.value })} placeholder="no @ needed" /></div>
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
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '10px 0' }}>
              <input type="checkbox" checked={addAgeAttested} onChange={(e) => setAddAgeAttested(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
              <span className="dim" style={{ fontSize: 12 }}>I confirm this creator is 18 years of age or older. Our agency is responsible for ensuring everyone we add is an adult; this platform is for adults only.</span>
            </label>
            <button className="btn" type="submit" disabled={!addAgeAttested}>Add to Roster</button>
          </form>

          <div className="card">
            <h2>Invite creators</h2>
            <p className="dim">Send each creator a single-use invite link — it works for exactly one signup and expires after 24 hours. Onboarding a whole roster at once? Generate a batch.</p>
            <form onSubmit={generateInvites} className="row" style={{ alignItems: 'flex-end' }}>
              <div className="field" style={{ maxWidth: 120 }}><label>How many</label>
                <input type="number" min={1} max={100} value={creatorInviteForm.count} onChange={(e) => setCreatorInviteForm({ ...creatorInviteForm, count: e.target.value })} />
              </div>
              <div className="field" style={{ flex: 1 }}><label>Label (optional — e.g. a name, so you can track who each code went to)</label>
                <input value={creatorInviteForm.label} onChange={(e) => setCreatorInviteForm({ ...creatorInviteForm, label: e.target.value })} placeholder="e.g. Mia, or 'March batch'" />
              </div>
              <button className="btn" type="submit" disabled={inviteBusy}>{inviteBusy ? 'Generating…' : 'Generate'}</button>
            </form>
            {creatorInviteMsg && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{creatorInviteMsg}</p>}

            {invites.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {invites.map((inv) => {
                  const isPending = inv.status === 'pending';
                  const statusColor = inv.status === 'redeemed' ? 'var(--gold)' : inv.status === 'pending' ? 'var(--cyan)' : 'var(--dim, #888)';
                  return (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                      <code style={{ fontWeight: 700, letterSpacing: 1, color: isPending ? 'var(--gold)' : 'var(--text)' }}>{inv.code}</code>
                      {inv.label && <span className="dim" style={{ fontSize: 12 }}>{inv.label}</span>}
                      <span style={{ fontSize: 11, color: statusColor, textTransform: 'capitalize' }}>{inv.status}</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        {isPending && <button className="btn ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => copyInvite(inv.code)}>Copy link</button>}
                        {isPending && <button className="btn ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => revokeInvite(inv.id)}>Revoke</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isManager && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!agency.allow_shared_code} onChange={(e) => toggleSharedCode(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
                  <span className="dim" style={{ fontSize: 13 }}>
                    <b style={{ color: 'var(--text)' }}>Also allow joining with the shared agency code</b><br />
                    When on, anyone with your agency code ({agency.agency_code}) can create a profile — easy for bulk group-sharing, but the same code can be reused many times. When off (recommended), the only way in is a single-use invite.
                  </span>
                </label>
              </div>
            )}
            {isManager && (
              <p className="dim" style={{ fontSize: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                Joining method: {agency.allow_shared_code ? 'invites and the shared agency code' : 'invite-only'}. Only an admin can change this.
              </p>
            )}
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ margin: 0 }}>Roster</h2>
              <button className="btn ghost" style={{ fontSize: 12 }} onClick={exportRosterCSV} disabled={creators.length === 0}>⬇ Export as CSV</button>
            </div>
            <div className="row" style={{ marginBottom: 10, marginTop: 10 }}>
              <div className="field" style={{ flex: 1 }}><label>Search by name or handle</label><input value={filters.search || ''} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search…" /></div>
              <div className="field"><label>Min diamonds</label><DiamondInput value={filters.min === '' ? 0 : Number(filters.min)} onChange={(v) => setFilters({ ...filters, min: v })} /></div>
              <div className="field"><label>Max diamonds</label><DiamondInput value={filters.max === '' ? 0 : Number(filters.max)} onChange={(v) => setFilters({ ...filters, max: v })} /></div>
              <div className="field"><label htmlFor="flt-type">Battle type</label>
                <select id="flt-type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                  <option value="all">All types</option>
                  {BATTLE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <p className="dim" style={{ fontSize: 12, marginTop: -4, marginBottom: 8 }}>
              Save your current diamond/league/type filters under a name, then re-apply them with one click any time — handy if you regularly check the same slice of your roster (e.g., "B-league, Toxic, 20k+").
            </p>
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
            {(() => {
              const now = Date.now();
              const statusOf = (b) => b.declined ? 'declined'
                : (b.accepted_a && b.accepted_b)
                  ? (new Date(b.datetime_utc).getTime() < now ? 'completed' : 'upcoming')
                  : 'pending';
              const counts = battles.reduce((acc, b) => { const s = statusOf(b); acc[s] = (acc[s] || 0) + 1; return acc; }, {});
              const filters = [
                ['all', `All (${battles.length})`],
                ['upcoming', `Upcoming (${counts.upcoming || 0})`],
                ['pending', `Awaiting (${counts.pending || 0})`],
                ['completed', `Completed (${counts.completed || 0})`],
                ['declined', `Declined (${counts.declined || 0})`]
              ];
              const shown = battleFilter === 'all' ? battles : battles.filter((b) => statusOf(b) === battleFilter);
              return (
                <>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {filters.map(([key, label]) => (
                      <button key={key} type="button" className={battleFilter === key ? 'btn' : 'btn ghost'}
                        style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setBattleFilter(key)}>{label}</button>
                    ))}
                  </div>
                  {shown.length === 0 ? (
                    <p className="dim">{battles.length === 0 ? 'No battles yet.' : 'No battles match this filter.'}</p>
                  ) : shown.map((b) => {
                    const a = creators.find((c) => c.id === b.creator_a);
                    const bb = creators.find((c) => c.id === b.creator_b);
                    const label = { declined: 'Declined', completed: 'Completed', upcoming: 'Confirmed', pending: 'Pending' }[statusOf(b)];
                    return (
                      <div key={b.id} className="vs">
                        <div className="side">{a ? a.name : '?'}</div>
                        <div className="mid">VS</div>
                        <div className="side b">{bb ? bb.name : '?'}</div>
                        <div className="vs-actions">
                          <span className="badge">{label}</span><br />
                          <span className="dim">{new Date(b.datetime_utc).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </>
      )}

      {adminTab === 'settings' && !isManager && (
        <>
          <div className="card">
            <h2>Billing</h2>
            <p className="dim">Status: <b>{agency.status}</b> · Plan: <b>{agency.plan_tier}</b> ({agency.billing_period})</p>

            {agency.status === 'active' && agency.stripe_cancel_at_period_end && agency.stripe_current_period_end && (
              <div className="card" style={{ borderColor: 'var(--pink)', marginTop: 10, marginBottom: 10 }}>
                <b style={{ color: 'var(--pink)' }}>Subscription canceled — access continues until it runs out.</b>
                <p className="dim" style={{ margin: '6px 0 0' }}>
                  You've already paid through this period, so nothing changes yet. Full access ends on{' '}
                  <b>{new Date(agency.stripe_current_period_end).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</b>{' '}
                  ({Math.max(0, Math.ceil((new Date(agency.stripe_current_period_end) - new Date()) / (24 * 60 * 60 * 1000)))} days left). Changed your mind? Manage Subscription below to resubscribe.
                </p>
              </div>
            )}

            {pendingBilling ? (
              <div>
                {!billingCodeSent ? (
                  <p className="dim">Sending you a verification code…</p>
                ) : (
                  <>
                    <p className="dim">We sent a 6-digit code to your contact email — check your inbox and enter it below.</p>
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
              <>
                <p className="dim">Your referral code: <b style={{ color: 'var(--gold)' }}>{agency.referral_code}</b> — share it with other agencies. When someone you refer becomes a paying customer, you get a free month automatically.</p>
                <div className="row" style={{ alignItems: 'center', marginTop: 8 }}>
                  <input readOnly value={referralLink} style={{ flex: 1, minWidth: 200 }} />
                  <button className="btn ghost" onClick={copyReferralLink}>{referralCopied ? 'Copied ✓' : 'Copy Link'}</button>
                  <button className="btn ghost" onClick={shareReferralLink}>Send to Someone</button>
                </div>
              </>
            ) : <p className="dim">No referral code on file.</p>}
          </div>

          <div className="card">
            <h2>Team &amp; Security</h2>
            <p className="dim">Individual logins instead of (or alongside) the shared admin/manager codes — each person gets their own email, password, and optional two-factor authentication, and can be removed individually.</p>

            {agency.agencyUserId ? (
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
                <b>Two-factor authentication (your account)</b>
                {my2fa ? (
                  <div style={{ marginTop: 8 }}>
                    <p className="dim">Scan this in your authenticator app, then enter the code it shows.</p>
                    <img src={my2fa.qrDataUrl} alt="2FA QR code" style={{ width: 160, height: 160, background: '#fff', padding: 6, borderRadius: 8 }} />
                    <div className="field" style={{ maxWidth: 200, marginTop: 8 }}>
                      <input value={twoFaConfirmCode} onChange={(e) => setTwoFaConfirmCode(e.target.value)} placeholder="123456" maxLength={6} />
                    </div>
                    <button className="btn" disabled={twoFaConfirmCode.length !== 6} onClick={confirm2faSetup}>Confirm &amp; Enable</button>
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn ghost" onClick={start2faSetup}>Turn on two-factor authentication</button>
                    <div style={{ marginTop: 8 }}>
                      <PasswordField value={disable2faPassword} onChange={(e) => setDisable2faPassword(e.target.value)} placeholder="Password (to turn off)" />
                      <button className="btn ghost" style={{ marginTop: 6 }} onClick={disable2fa} disabled={!disable2faPassword}>Turn off two-factor authentication</button>
                    </div>
                  </div>
                )}
                {twoFaMsg && <p className="dim" style={{ fontSize: 12, marginTop: 6 }}>{twoFaMsg}</p>}
              </div>
            ) : (
              <p className="dim" style={{ marginBottom: 14 }}>You're logged in with the shared admin code — set up an individual account above to enable 2FA for yourself.</p>
            )}

            <b>Team members</b>
            <div style={{ marginTop: 8 }}>
              {team.length === 0 && <p className="dim">No individual accounts yet.</p>}
              {team.map((t) => (
                <div key={t.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <b>{t.email}</b> <span className="dim">· {t.role}{t.totp_enabled ? ' · 2FA on' : ''}</span>
                    <div className="dim" style={{ fontSize: 11 }}>{t.last_login_at ? `Last login ${new Date(t.last_login_at).toLocaleDateString()}` : 'Never logged in'}</div>
                  </div>
                  <button className="btn ghost" onClick={() => removeTeamMember(t.id)}>Remove</button>
                </div>
              ))}
            </div>

            <form onSubmit={inviteTeamMember} style={{ marginTop: 12 }}>
              <div className="row">
                <input type="email" required placeholder="teammate@email.com" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} style={{ flex: 1 }} />
                <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="btn" type="submit">Invite</button>
              </div>
              {inviteMsg && <p className="dim" style={{ fontSize: 12, marginTop: 6 }}>{inviteMsg}</p>}
            </form>
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

          <div className="card" style={{ borderColor: 'var(--pink)' }}>
            <h2 style={{ color: 'var(--pink)' }}>Danger Zone</h2>
            <p className="dim">Permanently deletes this agency and everything tied to it — every creator, battle, post, and login. This cancels any active subscription first. There is no undo.</p>
            {!showDeleteConfirm ? (
              <button className="btn ghost" style={{ borderColor: 'var(--pink)', color: 'var(--pink)' }} onClick={() => setShowDeleteConfirm(true)}>Delete This Agency</button>
            ) : (
              <div>
                <div className="field" style={{ maxWidth: 320 }}>
                  <label>Type the agency name to confirm: <b>{agency.name}</b></label>
                  <input value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} />
                </div>
                <div className="field" style={{ maxWidth: 260 }}>
                  <label>Your admin code (or password)</label>
                  <PasswordField value={deleteConfirmCode} onChange={(e) => setDeleteConfirmCode(e.target.value)} />
                </div>
                {deleteMsg && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{deleteMsg}</p>}
                <button className="btn" style={{ background: 'var(--pink)', borderColor: 'var(--pink)' }} onClick={deleteAgency} disabled={!deleteConfirmName || !deleteConfirmCode}>Permanently Delete Everything</button>
                <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); setDeleteConfirmCode(''); setDeleteMsg(''); }}>Cancel</button>
              </div>
            )}
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
