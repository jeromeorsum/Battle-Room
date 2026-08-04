import { useState } from 'react';
import { PRICING_TIERS } from '../lib/pricing';

export default function Landing() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  return (
    <div className="wrap">
      <header style={{ textAlign: 'center', margin: '40px 0' }}>
        <h1 style={{ fontSize: 44 }}>BATTLE ROOM</h1>
        <p className="dim" style={{ fontSize: 16 }}>Schedule TikTok LIVE PK battles across your whole agency — matched by diamonds, league, and timezone.</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <a href="/signup" className="btn" style={{ textDecoration: 'none' }}>Start your agency's trial</a>
          <a href="/app" className="btn ghost" style={{ textDecoration: 'none' }}>I have an agency code</a>
        </div>
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
        <p className="dim" style={{ textAlign: 'center' }}>Pricing is early and may change — reach out if you need something custom.</p>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 16 }}>
          <button className={billingPeriod === 'monthly' ? 'btn' : 'btn ghost'} onClick={() => setBillingPeriod('monthly')}>Monthly</button>
          <button className={billingPeriod === 'yearly' ? 'btn' : 'btn ghost'} onClick={() => setBillingPeriod('yearly')}>Yearly</button>
        </div>
        <div className="opp-grid">
          {PRICING_TIERS.map((t) => {
            const isCustom = !t.monthly;
            return (
              <div key={t.id} className="card" style={isCustom ? { textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' } : undefined}>
                <h3 style={{ margin: '0 0 4px' }}>{t.label}</h3>
                <div className="dim">{t.maxCreators ? `Up to ${t.maxCreators} creators` : 'Unlimited creators'}</div>
                <div style={{ fontSize: isCustom ? 22 : 28, fontWeight: 800, margin: '14px 0' }}>
                  {t.monthly ? `$${billingPeriod === 'yearly' ? t.yearly : t.monthly}` : 'Custom pricing'}
                  {t.monthly && <span className="dim" style={{ fontSize: 13, fontWeight: 400 }}>/{billingPeriod === 'yearly' ? 'yr' : 'mo'}</span>}
                </div>
                <p className="dim">{t.blurb}</p>
                <a href="/signup" className="btn ghost" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 8 }}>
                  {t.monthly ? 'Get started' : 'Contact us'}
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
