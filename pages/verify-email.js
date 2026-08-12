import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function VerifyEmail() {
  const router = useRouter();
  const [status, setStatus] = useState('checking'); // checking | ok | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    if (!router.query.token) { setStatus('error'); setError('Missing verification token.'); return; }
    (async () => {
      try {
        const res = await fetch('/api/verify-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: router.query.token })
        });
        const data = await res.json();
        if (!res.ok) { setStatus('error'); setError(data.error || 'Could not verify this email.'); return; }
        setStatus('ok');
      } catch (e) { setStatus('error'); setError('Network error — try again.'); }
    })();
  }, [router.isReady, router.query.token]);

  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 420, margin: '80px auto', textAlign: 'center' }}>
        {status === 'checking' && <p className="dim">Verifying…</p>}
        {status === 'ok' && (
          <>
            <h2>Email confirmed ✅</h2>
            <p className="dim">This address is now on file as verified for billing codes, password resets, and invites.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h2>Couldn't verify</h2>
            <p className="dim">{error}</p>
          </>
        )}
        <a href="/admin" className="btn" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 10 }}>Go to Admin Login →</a>
      </div>
    </div>
  );
}
