export default function ServerError() {
  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 420, margin: '80px auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, margin: 0 }}>500</h1>
        <h2 style={{ marginTop: 4 }}>Something went wrong on our end</h2>
        <p className="dim">This has already been logged and flagged automatically. Try refreshing — if it keeps happening, let support know what you were doing.</p>
        <a href="/" className="btn" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 10 }}>Go home</a>
      </div>
    </div>
  );
}
