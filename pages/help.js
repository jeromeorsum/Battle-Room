const FAQS = [
  { q: 'I forgot my PIN. What do I do?', a: 'Ask your agency admin to reset it for you — they can do this from the Roster section in /admin without needing your old PIN.' },
  { q: 'I\u2019m an admin and forgot my admin code. What do I do?', a: 'On the /admin login screen, click "Forgot your admin code?" and enter your agency code plus the contact email on file — you\u2019ll get a reset link by email. If that email is no longer set up, contact the platform owner.' },
  { q: 'What happens if my agency\u2019s subscription lapses?', a: 'You can still log in and see your existing roster, battles, and posts, but you can\u2019t add new creators, book new battles, respond to invites, or post until your subscription is reactivated.' },
  { q: 'Why aren\u2019t push notifications working on my iPhone?', a: 'iOS only allows push notifications for sites added to the Home Screen. Tap the Share icon in Safari, choose "Add to Home Screen," then reopen the app from there before enabling notifications.' },
  { q: 'Can I change my TikTok handle after creating my profile?', a: 'Yes — go to the Profile tab any time and update it. No need to include the @ symbol.' },
  { q: 'Who can see my diamonds and league?', a: 'Only people within your own agency. Other agencies on the platform never see your roster, battles, or posts.' },
  { q: 'How is a "fair matchup" decided on the Find Opponent tab?', a: 'It\u2019s based on how close your diamond count and league are to another creator\u2019s, with a preference for people in your own timezone.' }
];

export default function Help() {
  return (
    <div className="wrap">
      <h1>Help &amp; FAQ</h1>
      {FAQS.map((f, i) => (
        <div key={i} className="card">
          <h2 style={{ fontSize: 15 }}>{f.q}</h2>
          <p className="dim" style={{ margin: '6px 0 0' }}>{f.a}</p>
        </div>
      ))}
      <p className="dim">Still stuck? Reach out to your agency admin, or the platform owner if you're an admin yourself.</p>
    </div>
  );
}
