export default function Compliance() {
  return (
    <div className="wrap">
      <h1>Compliance</h1>
      <p className="dim">A single place for the legal/compliance state of this platform — useful for your own reference and for whoever reviews this with a lawyer.</p>

      <div className="card">
        <h2>Documents</h2>
        <p><a href="/tos" style={{ color: 'var(--cyan)' }}>Terms of Service</a> — placeholder, not lawyer-reviewed.</p>
        <p><a href="/privacy" style={{ color: 'var(--cyan)' }}>Privacy Policy</a> — placeholder, not lawyer-reviewed.</p>
      </div>

      <div className="card">
        <h2>Third-party data processors</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li className="dim">Supabase — database, file storage</li>
          <li className="dim">Vercel — hosting</li>
          <li className="dim">Stripe — payment processing (once connected)</li>
          <li className="dim">Resend — transactional email (account recovery)</li>
        </ul>
        <p className="dim">Each may need a Data Processing Agreement depending on your jurisdiction and customer base — confirm with a lawyer.</p>
      </div>

      <div className="card">
        <h2>Known open items</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li className="dim">Minors: this platform is now 18+ only, enforced via a required self-attestation checkbox at signup (both for creators and for agencies adding a creator). This significantly reduces COPPA/teen-privacy exposure but is self-reported, not independently verified — real ID verification would be a stronger (and more expensive) step if ever needed. Worth confirming with a lawyer whether attestation alone is sufficient for your situation.</li>
          <li className="dim">Two-tier users: creators are added by an agency and don't sign anything themselves. Whether an agency can bind them, or whether creators need their own agreement, hasn't been confirmed.</li>
          <li className="dim">Auto-renewal disclosure requirements vary by state (California and New York have specific rules) — not yet reviewed.</li>
          <li className="dim">Data deletion policy after cancellation is informal (view-only access, no automatic deletion) — may need a defined policy.</li>
        </ul>
      </div>

      <div className="card">
        <h2>Data subject requests</h2>
        <p className="dim">To request access to, correction of, or deletion of your data, contact your agency admin, or the platform owner if you are an agency admin.</p>
      </div>
    </div>
  );
}
