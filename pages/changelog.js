const CHANGES = [
  { date: '2026-08-05', items: [
    'Added an audit log for admin actions, CSV roster export, and an onboarding checklist for new agencies',
    'Added a proactive "Install App" prompt and a getting-started checklist',
    'Fixed a bug where board posts weren\u2019t visible to other creators in the same agency',
    'Redesigned sign-in: returning devices go straight to a handle + PIN form instead of browsing a list',
    'Added profile pictures, a gender field, and rebuttal ("propose a different time") invites'
  ]},
  { date: '2026-08-04', items: [
    'Rebuilt as a real multi-tenant platform: isolated agencies, agency/admin codes, and a super admin dashboard',
    'Added Stripe billing scaffolding and automated subscription cutoff enforcement',
    'Added a full security pass: rate limiting, session cookies, PIN/code hashing, and security headers',
    'Made the site mobile-responsive with a real timezone-aware date/time picker',
    'Added the "Find a Battle" community post board'
  ]}
];

export default function Changelog() {
  return (
    <div className="wrap">
      <h1>What's New</h1>
      <p className="dim">A running log of updates to Battle Room.</p>
      {CHANGES.map((entry) => (
        <div key={entry.date} className="card">
          <h2 style={{ fontSize: 16 }}>{new Date(entry.date + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</h2>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            {entry.items.map((item, i) => <li key={i} className="dim" style={{ marginBottom: 6 }}>{item}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
