import Head from 'next/head';
export default function Privacy() {
  return (
    <div className="wrap">
      <Head><title>Privacy Policy · Battle Room</title></Head>
      <div className="card">
        <h1>Privacy Policy</h1>
        <p className="dim">Last updated: August 5, 2026. This is a placeholder — like the Terms of Service, it has not been reviewed by a lawyer and should not be relied on as-is before real agencies' data is involved.</p>

        <h3>What we collect</h3>
        <p>Agency contact info (name, email, phone), creator profile info (nickname, handle, diamond counts, league, timezone, optional profile picture and gender), and battle/post activity within your agency.</p>

        <h3>Who can see it</h3>
        <p>Only people within your own agency can see your roster, battles, and posts. Other agencies on the platform never see your data. The platform owner (via the super admin role) can see aggregate info across agencies for support and billing purposes.</p>

        <h3>Third parties we use</h3>
        <p>Data is processed through Supabase (database and file storage), Vercel (hosting), Stripe (payment processing, once connected), and Resend (email, for account recovery). Each of these has its own privacy practices.</p>

        <h3>Minors</h3>
        <p>This platform is intended for adults only. Everyone who creates an account — agency admins, managers, and creators — must confirm they are 18 years of age or older before an account can be created. This is a self-reported confirmation, not independently verified.</p>

        <h3>Data retention</h3>
        <p>If an agency's subscription is canceled, existing data remains viewable but no new data can be added. Contact us if you'd like your agency's data deleted entirely.</p>

        <h3>Your rights</h3>
        <p>You can request access to, correction of, or deletion of your data by contacting your agency admin, or the platform owner if you are an agency admin yourself.</p>
      </div>
    </div>
  );
}
