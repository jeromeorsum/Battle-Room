export default function NotFound() {
  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 420, margin: '80px auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, margin: 0 }}>404</h1>
        <h2 style={{ marginTop: 4 }}>Page not found</h2>
        <p className="dim">This page doesn't exist — the link might be broken, or the page may have moved.</p>
        <a href="/" className="btn" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 10 }}>Go home</a>
      </div>
    </div>
  );
}
