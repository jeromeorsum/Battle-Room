export function SkeletonLine({ width = '100%', height = 14 }) {
  return <div style={{ width, height, borderRadius: 6, background: 'var(--bg-raised)', animation: 'br-pulse 1.4s ease-in-out infinite' }} />;
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-raised)', animation: 'br-pulse 1.4s ease-in-out infinite' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonLine width="50%" />
          <SkeletonLine width="30%" height={11} />
        </div>
      </div>
      <SkeletonLine width="80%" />
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </>
  );
}
