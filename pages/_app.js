import { Component } from 'react';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';
import * as Sentry from '@sentry/nextjs';
import '../styles/globals.css';
import NavMenu from '../components/NavMenu';
import { NotifyHost } from '../components/Notify';

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
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Battle Room Clash — Schedule Live PK Battles for Agencies</title>
      </Head>
      <NavMenu />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <main id="main-content">
        <ErrorBoundary>
          <Component {...pageProps} />
        </ErrorBoundary>
      </main>
      <Analytics />
      <NotifyHost />
    </>
  );
}
