import { useState } from 'react';

const CATEGORIES = [
  {
    name: 'Getting Started',
    faqs: [
      { q: 'How do I join my agency?', a: 'Ask your agency admin for your agency code, enter it at the "I have an agency code" page, then create your profile or sign in.' },
      { q: 'What\u2019s the difference between an admin code and a manager code?', a: 'An admin code has full access, including billing and removing creators. A manager code can book battles and manage the roster, but can\u2019t touch billing, remove creators, reset other people\u2019s PINs, or change the admin code.' },
      { q: 'How long is the free trial?', a: '14 days, no card required. You\u2019ll get email reminders at 7 days and 1 day before it ends. After it ends, you can still view your existing roster and battles, but can\u2019t add new creators, book battles, or post until you subscribe.' },
      { q: 'Is there an age requirement?', a: 'Yes — this platform is for adults only. Everyone creating an account (agency admins, managers, and creators) has to confirm they\u2019re 18 or older before the account can be created.' }
    ]
  },
  {
    name: 'Account & Access',
    faqs: [
      { q: 'I forgot my PIN. What do I do?', a: 'Ask your agency admin to reset it for you — they can do this from the Roster section in /admin without needing your old PIN.' },
      { q: 'I\u2019m an admin and forgot my admin code. What do I do?', a: 'On the /admin login screen, click "Forgot your admin code?" and enter your agency code plus the contact email on file — you\u2019ll get a reset link by email.' },
      { q: 'Why can\u2019t I create a new profile with my old handle?', a: 'If your agency removed you, your handle is blocked from self-signing-up again — this stops someone from silently rejoining after being removed. Ask your agency admin to explicitly re-add you; that automatically lifts the block.' },
      { q: 'I changed my handle — can I update it?', a: 'Yes, go to the Profile tab any time and update it. No need to include the @ symbol.' },
      { q: 'Can two creators in the same agency have the same handle?', a: 'Nothing technically stops it, but it\u2019s not recommended — it makes signing back in confusing since sign-in matches by handle or nickname.' }
    ]
  },
  {
    name: 'Billing & Subscriptions',
    faqs: [
      { q: 'What happens when my trial ends?', a: 'You keep view access to everything, but can\u2019t add creators, book battles, respond to invites, or post until you subscribe. Your plan tier is automatically set based on how many creators you actually have on your roster.' },
      { q: 'Why do I need a code to subscribe or manage billing?', a: 'A 6-digit code is emailed to your contact address before any billing action goes through — this protects against someone getting into your admin panel and changing your payment method without your knowledge.' },
      { q: 'Can I cancel any time?', a: 'Yes, from Settings → Manage Subscription. Your data stays viewable after canceling, you just can\u2019t add new data until reactivated.' },
      { q: 'What\u2019s the referral program?', a: 'Every agency gets a referral code (find yours in Settings). Share it with other agencies — when someone you refer becomes a paying customer, you automatically get a free month.' }
    ]
  },
  {
    name: 'Creators & Matching',
    faqs: [
      { q: 'Who can see my diamonds and league?', a: 'Only people within your own agency. Other agencies on the platform never see your roster, battles, or posts.' },
      { q: 'How is a "best match" decided on Find Opponent?', a: 'It\u2019s based on how close your diamond count and league are to another creator\u2019s, with a preference for people in your own timezone. You can also sort by diamonds, league, or name instead.' },
      { q: 'What does "Active recently" mean on a creator card?', a: 'They logged in sometime in the last 7 days — a rough signal for who\u2019s actually using the platform right now.' },
      { q: 'Can I favorite someone I battle often?', a: 'Yes — tap the star on their card in Find Opponent. Favorites always show at the top of the list, regardless of sort order.' }
    ]
  },
  {
    name: 'Notifications & Mobile',
    faqs: [
      { q: 'Why aren\u2019t push notifications working on my iPhone?', a: 'iOS only allows push notifications for sites added to the Home Screen. Tap the Share icon in Safari, choose "Add to Home Screen," then reopen the app from there before enabling notifications.' },
      { q: 'Can I turn notifications off?', a: 'Yes, from the Profile tab — "Turn off notifications."' },
      { q: 'I uploaded a profile picture but it\u2019s not showing — just my initials.', a: 'This usually means the photo was in HEIC format (the default for iPhone camera photos), which most browsers can\u2019t display even though the upload itself succeeds. On iPhone: Settings → Camera → Formats → "Most Compatible" to save photos as JPEG instead.' }
    ]
  }
];

export default function Help() {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const filtered = CATEGORIES.map((cat) => ({
    ...cat,
    faqs: cat.faqs.filter((f) => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  })).filter((cat) => cat.faqs.length > 0);

  return (
    <div className="wrap">
      <h1>Help &amp; FAQ</h1>
      <div className="field" style={{ maxWidth: 400 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions…" />
      </div>
      {filtered.length === 0 && <p className="dim">No questions match "{search}".</p>}
      {filtered.map((cat) => (
        <div key={cat.name}>
          <h2 style={{ marginTop: 24 }}>{cat.name}</h2>
          {cat.faqs.map((f, i) => (
            <div key={i} className="card">
              <h3 style={{ fontSize: 15, margin: 0 }}>{f.q}</h3>
              <p className="dim" style={{ margin: '6px 0 0' }}>{f.a}</p>
            </div>
          ))}
        </div>
      ))}
      <p className="dim">Still stuck? Reach out to your agency admin, or the platform owner if you're an admin yourself. You can also <a href="/feedback" style={{ color: 'var(--cyan)' }}>send feedback</a> directly.</p>
    </div>
  );
}
