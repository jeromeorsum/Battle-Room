import Head from 'next/head';
import { useEffect, useState } from 'react';
import { SkeletonList } from '../components/Skeleton';

export default function Roadmap() {
  const [items, setItems] = useState([]);
  const [voted, setVoted] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setVoted(new Set(JSON.parse(localStorage.getItem('battleroom-roadmap-votes') || '[]'))); } catch (e) {}
    load();
  }, []);

  async function load() {
    const res = await fetch('/api/roadmap');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  async function vote(itemId) {
    if (voted.has(itemId)) return;
    const res = await fetch('/api/roadmap/vote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId })
    });
    if (res.ok) {
      const next = new Set(voted); next.add(itemId);
      setVoted(next);
      localStorage.setItem('battleroom-roadmap-votes', JSON.stringify([...next]));
      load();
    }
  }

  return (
    <div className="wrap">
      <Head><title>Roadmap · Battle Room</title></Head>
      <h1>Roadmap</h1>
      <p className="dim">Vote for what you'd like to see next — the most-voted ideas get built first.</p>
      {loading ? <SkeletonList count={4} /> : items.map((item) => (
        <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <b>{item.title}</b>
            {item.description && <p className="dim" style={{ margin: '4px 0 0' }}>{item.description}</p>}
          </div>
          <button
            className={voted.has(item.id) ? 'btn' : 'btn ghost'}
            onClick={() => vote(item.id)}
            disabled={voted.has(item.id)}
            style={{ flexShrink: 0, minWidth: 70 }}
          >
            ▲ {item.votes}
          </button>
        </div>
      ))}
      <p className="dim">Have an idea that's not here? <a href="/feedback" style={{ color: 'var(--cyan)' }}>Send it in</a>.</p>
    </div>
  );
}
