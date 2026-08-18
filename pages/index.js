import { useEffect, useState } from 'react';
import { PRICING_TIERS } from '../lib/pricing';

export default function Landing() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/public-stats').then((r) => r.ok ? r.json() : null).then(setStats).catch(() => {});
  }, []);

  return (
    <div className="wrap">
      <header style={{ textAlign: 'center', margin: '40px 0' }}>
        <h1 style={{ fontSize: 44 }}>BATTLE ROOM</h1>
        <p className="dim" style={{ fontSize: 16 }}>Schedule live PK battles across your whole agency — matched by diamonds, league, and timezone.</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <a href="/signup" className="btn" style={{ textDecoration: 'none' }}>Start your agency's trial</a>
          <a href="/app" className="btn ghost" style={{ textDecoration: 'none' }}>I have an agency code</a>
        </div>
        {stats && (stats.agencies > 0 || stats.creators > 0) && (
          <p className="dim" style={{ marginTop: 18, fontSize: 13 }}>
            {stats.agencies} {stats.agencies === 1 ? 'agency' : 'agencies'} · {stats.creators} creators · {stats.battles} battles scheduled and counting
          </p>
        )}
      </header>

      <div className="card">
        <h2 style={{ textAlign: 'center' }}>What you get</h2>
        <div className="opp-grid">
          <div><b>Fair matchmaking</b><p className="dim">Auto-matches creators by diamonds, league, timezone, and battle type.</p></div>
          <div><b>Invite &amp; accept flow</b><p className="dim">Nobody's on a battle they didn't agree to.</p></div>
          <div><b>Real push notifications</b><p className="dim">Creators get alerted the moment a battle's proposed or confirmed.</p></div>
          <div><b>Isolated per agency</b><p className="dim">Your roster is never visible to other agencies on the platform.</p></div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ textAlign: 'center' }}>Pricing</h2>
        <p className="dim" style={{ textAlign: 'center' }}>Every plan starts with a 14-day free trial — no card required.</p>
        <div className="row" style={{ justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <button className={billingPeriod === 'monthly' ? 'btn' : 'btn ghost'} onClick={() => setBillingPeriod('monthly')}>Monthly</button>
          <button className={billingPeriod === 'yearly' ? 'btn' : 'btn ghost'} onClick={() => setBillingPeriod('yearly')}>Yearly</button>
          <span className="dim" style={{ fontSize: 12, color: 'var(--gold)' }}>Yearly = 2 months free</span>
        </div>
        <div className="pricing-grid">
          {PRICING_TIERS.map((t) => {
            const isCustom = !t.monthly;
            return (
              <div key={t.id} className={`card pricing-card${t.popular ? ' pricing-popular' : ''}`}>
                {t.popular && <div className="pricing-badge">Most popular</div>}
                <h3 style={{ margin: '0 0 4px' }}>{t.label}</h3>
                <div className="dim">{t.maxCreators ? `Up to ${t.maxCreators} creators` : 'Unlimited creators'}</div>
                <div style={{ fontSize: isCustom ? 22 : 28, fontWeight: 800, margin: '14px 0 4px' }}>
                  {t.monthly ? `$${billingPeriod === 'yearly' ? t.yearly : t.monthly}` : 'Custom'}
                  {t.monthly && <span className="dim" style={{ fontSize: 13, fontWeight: 400 }}>/{billingPeriod === 'yearly' ? 'yr' : 'mo'}</span>}
                </div>
                <div className="dim" style={{ fontSize: 12, minHeight: 16, marginBottom: 10 }}>
                  {t.monthly && t.maxCreators ? `As low as $${(( (billingPeriod === 'yearly' ? t.yearly / 12 : t.monthly) ) / t.maxCreators).toFixed(2)}/creator` : 'Volume pricing available'}
                </div>
                <p className="dim" style={{ flexGrow: 1 }}>{t.blurb}</p>
                <a href={t.monthly ? '/signup' : 'mailto:benjaminmilroy@gmail.com?subject=Battle%20Room%20Enterprise'} className={t.popular ? 'btn' : 'btn ghost'} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 8 }}>
                  {t.monthly ? 'Start free trial' : 'Contact us'}
                </a>
              </div>
            );
          })}
        </div>
      </div>

      <p className="dim" style={{ textAlign: 'center', marginTop: 30 }}>
        Already have an agency admin code? <a href="/admin" style={{ color: 'var(--cyan)' }}>Go to Admin →</a>
      </p>
    </div>
  );
}
