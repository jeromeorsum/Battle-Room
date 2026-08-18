import Head from 'next/head';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/router';
import * as Sentry from '@sentry/nextjs';
import { PRICING_TIERS } from '../lib/pricing';
import PasswordField from '../components/PasswordField';

export default function Signup() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [form, setForm] = useState({ name: '', adminCode: '', managerCode: '', planTier: 'starter', contactEmail: '', contactPhone: '', referralCode: '' });
  const [ageAttested, setAgeAttested] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  function reportTurnstileUnavailable(reason) {
    setTurnstileUnavailable(true);
    // This blocks real signups when it happens, so it's worth knowing about
    // immediately rather than finding out from a confused user — same
    // failure mode that happened once already (Cloudflare's script server
    // returning 503).
    Sentry.captureMessage(`Turnstile widget failed to load on signup: ${reason}`, 'warning');
  }

  function renderTurnstileWidget() {
    if (!turnstileSiteKey || typeof window === 'undefined' || !window.turnstile) return;
    const el = document.getElementById('turnstile-widget');
    if (el && !el.hasChildNodes()) {
      window.turnstile.render('#turnstile-widget', {
        sitekey: turnstileSiteKey,
        theme: 'dark',
        callback: (token) => setTurnstileToken(token)
      });
    }
  }

  useEffect(() => {
    // Covers the case where the script (loaded elsewhere on the page, or
    // cached from a prior visit) is already available by the time this
    // component mounts — the Script tag's onLoad won't fire again in that
    // case, so this catches it too.
    renderTurnstileWidget();
  }, [turnstileSiteKey]);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    // If the script hasn't loaded and rendered a working widget within a
    // reasonable window, stop leaving the person staring at an empty box
    // with no explanation — tell them plainly what's going on.
    const timer = setTimeout(() => {
      if (!document.getElementById('turnstile-widget')?.hasChildNodes()) {
        reportTurnstileUnavailable('timed out waiting for script to load');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [turnstileSiteKey]);

  useEffect(() => {
    if (router.query.ref) {
      setForm((f) => ({ ...f, referralCode: String(router.query.ref).toUpperCase() }));
    }
  }, [router.query.ref]);

  async function submit(e) {
    if (e) e.preventDefault();
    if (submitting) return; // guard against double-clicks creating duplicate agencies/customers
    setError('');
    if (!form.name || !form.adminCode) { setError('Agency name and an admin code are required.'); return; }
    if (!form.contactEmail || !form.contactPhone) { setError('Contact email and phone are both required.'); return; }
    if (!ageAttested) { setError('Please confirm you are 18 or older to continue.'); return; }
    // Fail open: only hold the user up if the widget actually loaded and is
    // simply waiting on them. If it never loaded (Cloudflare down), we let
    // the submit proceed — the backend also fails open, so real people are
    // never blocked by a third-party outage.
    if (turnstileSiteKey && !turnstileToken && !turnstileUnavailable) {
      setError('Please complete the verification check above.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/agencies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, billingPeriod, ageAttested, turnstileToken })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Signup failed.'); return; }
      setResult(data);
    } catch (err) {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(result.agency_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  function copyReferral() {
    navigator.clipboard.writeText(result.referral_code);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  }

  function downloadCode() {
    const blob = new Blob([
      `Battle Room — ${result.name}\n\nAgency Code: ${result.agency_code}\n\nKeep this somewhere safe (a password manager is best). Anyone with this code plus an admin code can manage your agency.\n`
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${result.name.replace(/\s+/g, '-').toLowerCase()}-battle-room-code.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  if (result) {
    const trialEnd = result.trial_ends_at ? new Date(result.trial_ends_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : null;
    return (
      <div className="wrap">
        <Head><title>Sign Up · Battle Room</title></Head>
        <div className="card" style={{ maxWidth: 480, margin: '60px auto' }}>
          <h2>You're set up 🎉</h2>
          {trialEnd && <p className="dim">Your 14-day free trial runs through <b style={{ color: 'var(--gold)' }}>{trialEnd}</b>.</p>}
          <p className="dim">Save this — there's no email recovery for it, so store it somewhere real (a password manager is best) before sharing it with your creators.</p>
          <div className="field">
            <label>Your Agency Code</label>
            <div className="row" style={{ alignItems: 'center' }}>
              <input readOnly value={result.agency_code} style={{ fontWeight: 700, letterSpacing: 2, flex: 1 }} />
              <button className="btn ghost" onClick={copyCode} type="button">{copied ? 'Copied ✓' : 'Copy'}</button>
            </div>
          </div>
          <button className="btn ghost" onClick={downloadCode} type="button" style={{ width: '100%', marginTop: 6 }}>Download as a text file (backup)</button>
          <p className="dim" style={{ marginTop: 14 }}>Your admin code is the one you just chose — use it together with the agency code above at <code>/admin</code> to book battles and manage your roster.</p>
          <p className="dim">Plan: <b>{result.plan_tier}</b> · Billing: <b>{result.billing_period}</b> · Status: <b>{result.status}</b></p>

          {result.referral_code && (
            <div className="field" style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <label>Your Referral Code</label>
              <p className="dim" style={{ margin: '0 0 8px' }}>Share this with other agencies. When someone you refer becomes a paying customer, you get a free month.</p>
              <div className="row" style={{ alignItems: 'center' }}>
                <input readOnly value={result.referral_code} style={{ fontWeight: 700, letterSpacing: 2, flex: 1 }} />
                <button className="btn ghost" onClick={copyReferral} type="button">{copiedReferral ? 'Copied ✓' : 'Copy'}</button>
              </div>
            </div>
          )}

          <a href="/admin" className="btn" style={{ display: 'inline-block', marginTop: 14, textDecoration: 'none' }}>Go to Admin →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <Head><title>Sign Up · Battle Room</title></Head>
      <h1>Set up your agency</h1>
      <p className="dim">Start with a 14-day free trial — no card required until you're ready to subscribe.</p>
      <form className="card" style={{ maxWidth: 480 }} onSubmit={submit}>
        <div className="field"><label>Agency name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label>Contact email (required — for billing/account questions)</label><input type="email" required value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
        <div className="field"><label>Contact phone (required)</label><input type="tel" required value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
        <div className="field"><label>Choose an admin code (full access — billing, remove creators, everything)</label>
          <PasswordField value={form.adminCode} onChange={(e) => setForm({ ...form, adminCode: e.target.value })} />
        </div>
        <div className="field"><label>Manager code (optional — lets staff book battles without seeing billing or removing people)</label>
          <PasswordField value={form.managerCode} onChange={(e) => setForm({ ...form, managerCode: e.target.value })} />
          <div className="dim">Leave blank if you don't need this — you can add it later from the admin panel.</div>
        </div>
        <div className="field"><label>Referral code (optional)</label><input value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })} placeholder="Got one from another agency?" /></div>

        <div className="field">
          <label>Plan</label>
          <div className="row" style={{ marginBottom: 8 }}>
            <button type="button" className={billingPeriod === 'monthly' ? 'btn' : 'btn ghost'} onClick={() => setBillingPeriod('monthly')}>Monthly</button>
            <button type="button" className={billingPeriod === 'yearly' ? 'btn' : 'btn ghost'} onClick={() => setBillingPeriod('yearly')}>Yearly</button>
          </div>
          <select value={form.planTier} onChange={(e) => setForm({ ...form, planTier: e.target.value })}>
            {PRICING_TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} — {t.monthly ? `$${billingPeriod === 'yearly' ? t.yearly : t.monthly}/${billingPeriod === 'yearly' ? 'yr' : 'mo'}` : 'contact us'}
              </option>
            ))}
          </select>
        </div>

        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '10px 0' }}>
          <input type="checkbox" checked={ageAttested} onChange={(e) => setAgeAttested(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span className="dim" style={{ fontSize: 12 }}>I confirm I am 18 years of age or older, and I agree to the <a href="/tos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>Terms of Service</a>. This platform is for adults only.</span>
        </label>

        {turnstileSiteKey && (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js"
              strategy="afterInteractive"
              onLoad={renderTurnstileWidget}
              onError={() => reportTurnstileUnavailable('script failed to load')}
            />
            <div id="turnstile-widget" style={{ margin: '10px 0' }} />
            {turnstileUnavailable && (
              <p className="dim" style={{ fontSize: 12, color: 'var(--gold)' }}>
                The bot-check couldn&apos;t load right now — that&apos;s on our end, not yours. You can go ahead and create your agency anyway.
              </p>
            )}
          </>
        )}
        {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
        <button className="btn" type="submit" disabled={!ageAttested || submitting}>{submitting ? 'Creating…' : 'Create Agency'}</button>
        <p className="dim" style={{ marginTop: 10 }}>This starts a 14-day free trial. One trial per email address.</p>
      </form>
    </div>
  );
}
