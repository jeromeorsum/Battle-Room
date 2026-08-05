import { useState } from 'react';
import { useRouter } from 'next/router';
import PasswordField from '../components/PasswordField';

export default function ResetAdminCode() {
  const router = useRouter();
  const { agencyId, token } = router.query;
  const [newCode, setNewCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/reset-admin-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyId, token, newCode })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Could not reset code.'); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="wrap">
        <div className="card" style={{ maxWidth: 380, margin: '60px auto' }}>
          <h2>Admin code updated ✅</h2>
          <a href="/admin" className="btn" style={{ display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>Go to Admin Login →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <form className="card" style={{ maxWidth: 380, margin: '60px auto' }} onSubmit={submit}>
        <h2>Set a new admin code</h2>
        <div className="field"><label>New admin code (8+ characters)</label>
          <PasswordField value={newCode} onChange={(e) => setNewCode(e.target.value)} minLength={8} />
        </div>
        {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
        <button className="btn" type="submit">Set New Code</button>
      </form>
    </div>
  );
}
