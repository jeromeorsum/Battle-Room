import { Component, useEffect, useState } from 'react';
import Head from 'next/head';
import * as Sentry from '@sentry/nextjs';
import '../styles/globals.css';
import NavMenu from '../components/NavMenu';
import { TOS_VERSION } from '../lib/tosVersion';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error('Caught by ErrorBoundary:', error, info);
    Sentry.captureException(error, { extra: { componentStack: info?.componentStack } });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="wrap">
          <div className="card" style={{ maxWidth: 480, margin: '60px auto' }}>
            <h2>Something went wrong</h2>
            <p className="dim">This page hit an unexpected error. Refreshing usually fixes it — if it keeps happening, note what you were doing and let support know.</p>
            <button className="btn" onClick={() => window.location.reload()}>Refresh</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App({ Component, pageProps }) {
  const [acknowledged, setAcknowledged] = useState(true); // default true to avoid a flash before we check
  const [checked, setChecked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seenVersion = typeof window !== 'undefined' ? localStorage.getItem('battleroom-tos-ack-version') : TOS_VERSION;
    setAcknowledged(seenVersion === TOS_VERSION);
    setReady(true);
  }, []);

  function acknowledge() {
    localStorage.setItem('battleroom-tos-ack-version', TOS_VERSION);
    setAcknowledged(true);
  }

  if (!ready) return null;

  return (
    <>
      <Head>
        <title>Battle Room — TikTok Creator Battles for Agencies</title>
      </Head>
      <NavMenu />
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
      {!acknowledged && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,15,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div className="card" style={{ maxWidth: 420 }}>
            <h2>Before you continue</h2>
            <p className="dim">
              Please confirm you've read and agree to our{' '}
              <a href="/tos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>Terms of Service &amp; User Agreement</a>.
            </p>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '14px 0' }}>
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
              <span>I have read and acknowledge the Terms of Service &amp; User Agreement.</span>
            </label>
            <button className="btn" disabled={!checked} style={{ width: '100%', opacity: checked ? 1 : 0.5 }} onClick={acknowledge}>Continue</button>
          </div>
        </div>
      )}
    </>
  );
}
