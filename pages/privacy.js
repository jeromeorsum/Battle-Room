import Head from 'next/head';
export default function Privacy() {
  return (
    <div className="wrap">
      <Head><title>Privacy Policy · Battle Room Clash</title></Head>
      <div className="card">
        <h1>Privacy Policy</h1>
        <p className="dim">Last updated: August 20, 2026.</p>

        <h3>What we collect</h3>
        <p>Agency contact info (name, email, phone), creator profile info (nickname, handle, diamond counts, league, timezone, and optional gender), and battle/post activity within your agency.</p>

        <h3>Who can see it</h3>
        <p>Only people within your own agency can see your roster, battles, and posts. Other agencies on the platform never see your data. The platform owner (via the super admin role) can see aggregate info across agencies for support and billing purposes.</p>

        <h3>Third parties we use</h3>
        <p>Data is processed through Supabase (database and file storage), Vercel (hosting), Stripe (payment processing), and Resend (email, for account recovery). Each of these has its own privacy practices.</p>

        <h3>Minors</h3>
        <p>This platform is intended for adults only. Everyone who creates an account — agency admins, managers, and creators — must confirm they are 18 years of age or older before an account can be created. This is a self-reported confirmation, not independently verified.</p>

        <h3>Data retention</h3>
        <p>We keep your data only as long as we need it to provide the Service to you:</p>
        <ul>
          <li><b>While your account is active:</b> we retain your agency&apos;s data (roster, battles, posts, and team logins) so the Service works.</li>
          <li><b>After you cancel:</b> your data stays in a view-only state so you can still see it, export it, or reactivate later. No new data can be added until you resubscribe.</li>
          <li><b>Deletion you control:</b> an agency admin can permanently delete the agency and all of its data at any time from the admin panel. Deletion is immediate, cannot be undone, and we cannot recover the data afterward — so export anything you need first.</li>
          <li><b>Dormant cancelled accounts:</b> if an account stays cancelled and inactive for 12 months or more, we may delete it and its data after emailing the contact address on file first, so you have a chance to export or reactivate.</li>
          <li><b>Records we must keep:</b> we may retain limited billing and transaction records for longer where the law requires it (for example, tax and accounting records), and back-ups may persist for a short period before they cycle out.</li>
        </ul>

        <h3>Your rights</h3>
        <p>You can request access to, correction of, or deletion of your data by contacting your agency admin, or the platform owner if you are an agency admin yourself.</p>
      </div>
    </div>
  );
}
