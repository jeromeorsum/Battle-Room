import { useState } from 'react';
import { useRouter } from 'next/router';
import PasswordField from '../components/PasswordField';

export default function AcceptInvite() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords don\u2019t match.'); return; }
    try {
      const res = await fetch('/api/agency-users/accept-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: router.query.token, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not accept the invite.'); return; }
      setDone(true);
    } catch (e) { setError('Network error — try again.'); }
  }

  if (done) {
    return (
      <div className="wrap">
        <div className="card" style={{ maxWidth: 420, margin: '60px auto' }}>
          <h2>You're all set 🎉</h2>
          <p className="dim">Your account is ready. Head to the admin login and sign in with your email &amp; password.</p>
          <a href="/admin" className="btn" style={{ display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>Go to Admin Login →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <form className="card" style={{ maxWidth: 380, margin: '60px auto' }} onSubmit={submit}>
        <h2>Accept your invite</h2>
        <p className="dim">Set a password to finish setting up your account.</p>
        <div className="field"><label>Password (10+ characters)</label><PasswordField value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="field"><label>Confirm password</label><PasswordField value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
        <button className="btn" type="submit">Set Password</button>
      </form>
    </div>
  );
}
