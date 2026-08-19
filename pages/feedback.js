import Head from 'next/head';
import { useState } from 'react';

export default function Feedback() {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!message.trim()) { setError('Write something first.'); return; }
    const res = await fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message })
    });
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Could not send feedback.'); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="wrap">
        <Head><title>Feedback · Battle Room</title></Head>
        <div className="card" style={{ maxWidth: 480, margin: '60px auto' }}>
          <h2>Thanks! 🙏</h2>
          <p className="dim">Your feedback was sent. If you're reporting a bug, that context — what you were logged in as, what you clicked — is genuinely helpful, so feel free to send a follow-up with more detail.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <Head><title>Feedback · Battle Room</title></Head>
      <h1>Send Feedback</h1>
      <form className="card" style={{ maxWidth: 480 }} onSubmit={submit}>
        <p className="dim">Found a bug, or have an idea? Tell us here — it goes straight to the team.</p>
        <div className="field">
          <label>Your message</label>
          <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="What happened, or what would you like to see?" />
        </div>
        {error && <p style={{ color: 'var(--pink)', fontSize: 12 }}>{error}</p>}
        <button className="btn" type="submit">Send</button>
      </form>
    </div>
  );
}
