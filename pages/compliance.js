import Head from 'next/head';
export default function Compliance() {
  return (
    <div className="wrap">
      <Head><title>Compliance · Battle Room</title></Head>
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
          <li className="dim">Minors: this platform is now 18+ only. Agency owners and self-signing-up creators confirm their age with a date of birth at signup; creators added by an admin must confirm their own age (date of birth) the first time they sign in, before they can use the account. This significantly reduces COPPA/teen-privacy exposure but is self-reported, not independently verified — real ID verification would be a stronger (and more expensive) step if ever needed. Worth confirming with a lawyer whether attestation alone is sufficient for your situation.</li>
          <li className="dim">Two-tier users: creators added by an agency now confirm their own age on first sign-in, but they don&apos;t separately sign the Terms. Whether an agency can bind them, or whether creators need their own agreement, hasn&apos;t been confirmed with a lawyer.</li>
          <li className="dim">Auto-renewal: a clear-and-conspicuous auto-renewal disclosure is now shown on the pricing page and at signup, with explicit consent and free self-service online cancellation. Still to do: an advance renewal reminder for annual plans (15&ndash;45 days before renewal, required by some states) and a price-increase consent/cancel flow. Most state auto-renewal laws target consumers, and this is B2B, which likely narrows applicability &mdash; confirm specifics with a lawyer.</li>
          <li className="dim">Data deletion: a defined retention policy is now in the Privacy Policy &mdash; view-only after cancellation, admin-controlled permanent deletion at any time, a 12-month dormant-account deletion backstop with email notice, and a carve-out for records we must keep. Worth a lawyer&apos;s confirmation.</li>
        </ul>
      </div>

      <div className="card">
        <h2>Data subject requests</h2>
        <p className="dim">To request access to, correction of, or deletion of your data, contact your agency admin, or the platform owner if you are an agency admin.</p>
      </div>
    </div>
  );
}
