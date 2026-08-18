import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function Status() {
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(true);

  async function check() {
    setChecking(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth({ ok: res.ok, ...data });
    } catch (e) {
      setHealth({ ok: false, status: 'error', message: 'Could not reach the server.' });
    }
    setChecking(false);
  }

  useEffect(() => { check(); }, []);

  return (
    <div className="wrap">
      <Head><title>Status · Battle Room</title></Head>
      <h1>System Status</h1>
      <div className="card" style={{ borderColor: health?.ok ? 'var(--green)' : health ? 'var(--pink)' : 'var(--line)' }}>
        {checking && !health ? (
          <p className="dim">Checking…</p>
        ) : health?.ok ? (
          <>
            <h2 style={{ color: 'var(--green)' }}>✅ All systems operational</h2>
            <p className="dim">Website and database are both responding normally.</p>
          </>
        ) : (
          <>
            <h2 style={{ color: 'var(--pink)' }}>⚠️ Something's not right</h2>
            <p className="dim">{health?.message || 'The database or server is not responding as expected.'}</p>
          </>
        )}
        <p className="dim" style={{ fontSize: 11, marginTop: 10 }}>Last checked: {health?.time ? new Date(health.time).toLocaleString() : new Date().toLocaleString()}</p>
        <button className="btn ghost" onClick={check} disabled={checking}>{checking ? 'Checking…' : 'Check again'}</button>
      </div>
    </div>
  );
}
