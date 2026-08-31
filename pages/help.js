import Head from 'next/head';
import { useState } from 'react';

const CATEGORIES = [
  {
    name: 'Getting Started',
    faqs: [
      { q: 'What is Battle Room Clash?', a: 'Battle Room Clash is a scheduling tool for agencies that run live PK battles between their creators. You add your creators, find fair opponents by diamonds, league, and timezone, propose a time, and everyone gets notified and a calendar invite once it\u2019s confirmed. Think of it as matchmaking + a shared schedule for your whole roster.' },
      { q: 'How do I set up my agency?', a: 'Go to the Sign Up page, choose a plan, pick an admin code (your master password), enter your date of birth and contact email, and agree to the Terms. You\u2019ll get a 14-day free trial to try everything, and you can start inviting your streamers right away.' },
      { q: 'How do I add streamers to my roster?', a: 'Two ways. Send each streamer a single-use invite link from the \u201cInvite creators\u201d section of your dashboard \u2014 it works for one signup and expires after 24 hours (you can also bulk-generate a batch to onboard a whole roster at once). Or add someone directly yourself from the form on the dashboard. If you\u2019d rather let streamers join with one shared agency code instead of individual invites, an admin can turn that on in the same section.' },
      { q: 'How do I join my agency (as a streamer)?', a: 'Your agency sends you an invite link \u2014 just open it and it drops you on the signup screen with your code already filled in, so you set up a nickname and PIN and you\u2019re in. If your agency uses a shared code instead, tap \u201cStreamer Login\u201d and enter the code they gave you.' },
      { q: 'What\u2019s the difference between an admin code and a manager code?', a: 'An admin code has full access, including billing and removing creators. A manager code lets staff book battles and manage the roster, but can\u2019t touch billing, remove creators, reset other people\u2019s PINs, or change the admin code. Managers are optional — set one up from the admin panel if you want staff to help without giving them the keys to billing.' },
      { q: 'How long is the free trial?', a: '14 days. You\u2019ll get email reminders about 7 days and 1 day before it ends. After it ends, you keep view access to your existing roster and battles, but can\u2019t add new creators, book battles, or post until you subscribe.' },
      { q: 'Is there an age requirement?', a: 'Yes — Battle Room Clash is for adults only (18+). Agency owners and self-signing-up creators confirm their age with a date of birth when they create their account. If an admin adds a creator, that creator confirms their own age the first time they sign in, before they can use the account.' }
    ]
  },
  {
    name: 'Battles & Scheduling',
    faqs: [
      { q: 'How does scheduling a battle work, start to finish?', a: 'On Find Opponent, pick a creator, propose a date and time, and send it. The other creator gets a notification and either accepts or proposes a different time. Once both sides accept, the battle is confirmed — both get a notification and an \u201cadd to calendar\u201d button. Nobody ever ends up on a battle they didn\u2019t agree to.' },
      { q: 'Can I suggest a different time instead of just declining?', a: 'Yes — that\u2019s a counter-offer. Instead of declining outright, propose a new time and it goes back to the other creator to accept. It keeps the conversation going rather than ending it with a flat no.' },
      { q: 'Can I schedule a battle in the past?', a: 'No. Battles have to be for a time in the future, so nothing nonsensical ends up on your schedule.' },
      { q: 'Will creators get reminded before a battle starts?', a: 'Creators get notified the moment a battle is proposed, accepted, or confirmed, and when a confirmed battle is cancelled. A \u201cyour battle starts soon\u201d reminder shortly before the start time is also part of the system.' },
      { q: 'What happens if I cancel a confirmed battle?', a: 'The other creator is notified right away so nobody shows up expecting a battle that\u2019s off. Either participant can cancel, or an admin can cancel on their behalf.' },
      { q: 'How do I add a confirmed battle to my calendar?', a: 'On a confirmed battle, tap the calendar button. You can download a calendar file (works with Apple Calendar, Outlook, and others) or add it straight to Google Calendar.' }
    ]
  },
  {
    name: 'Creators & Matching',
    faqs: [
      { q: 'What are diamonds and league?', a: 'They\u2019re the two numbers Battle Room Clash uses to find fair matchups. Diamonds represent a creator\u2019s recent live-gifting level (each creator enters their own 30-day figure), and league is their ranking tier. Matching two creators with similar diamonds and league makes for a more even battle.' },
      { q: 'How is a \u201cbest match\u201d decided on Find Opponent?', a: 'It looks at how close another creator\u2019s diamonds and league are to yours, and prefers people in your own timezone (easier to schedule live). Favorites float to the top. You can also sort by diamonds, league, or name instead.' },
      { q: 'Who can see my diamonds and league?', a: 'Only people within your own agency. Other agencies on the platform never see your roster, battles, or posts — every agency is fully isolated.' },
      { q: 'What does \u201cActive recently\u201d mean on a creator card?', a: 'They logged in sometime in the last 7 days — a rough signal for who\u2019s actually using the platform right now.' },
      { q: 'Can I favorite someone I battle often?', a: 'Yes — tap the star on their card in Find Opponent. Favorites always show at the top of the list, regardless of sort order.' },
      { q: 'What timezones are supported?', a: 'The common ones are built in and shown on each creator\u2019s profile and battle cards, so times are always clear to both sides no matter where they are.' }
    ]
  },
  {
    name: 'Account & Access',
    faqs: [
      { q: 'I forgot my PIN. What do I do?', a: 'Ask your agency admin to reset it for you — they can do this from the Roster section in the admin panel without needing your old PIN.' },
      { q: 'I\u2019m an admin and forgot my admin code. What do I do?', a: 'On the admin login screen, click \u201cForgot your admin code?\u201d and enter your agency code plus the contact email on file — you\u2019ll get a reset link by email.' },
      { q: 'Why can\u2019t I create a new profile with my old handle?', a: 'If your agency removed you, your handle is blocked from self-signing-up again — this stops someone from silently rejoining after being removed. Ask your agency admin to explicitly re-add you; that automatically lifts the block.' },
      { q: 'I changed my handle — can I update it?', a: 'Yes, go to the Profile tab any time and update it. No need to include the @ symbol.' },
      { q: 'Can two creators in the same agency have the same handle?', a: 'Nothing technically stops it, but it\u2019s not recommended — it makes signing back in confusing, since sign-in matches by handle or nickname.' }
    ]
  },
  {
    name: 'Billing & Subscriptions',
    faqs: [
      { q: 'How is my plan tier decided, and what do the tiers cost?', a: 'Plans are based on roster size — Starter, Growth, and Scale cover progressively larger rosters, with an Enterprise option for the biggest. The current prices and creator limits are shown on the Sign Up / pricing page. Your tier is set based on how many creators you actually have.' },
      { q: 'What happens when my trial ends?', a: 'You keep view access to everything, but can\u2019t add creators, book battles, respond to invites, or post until you subscribe.' },
      { q: 'Why do I need a code to subscribe or manage billing?', a: 'A 6-digit code is emailed to your contact address before any billing action goes through — this protects against someone getting into your admin panel and changing your payment method without your knowledge.' },
      { q: 'Can I cancel any time?', a: 'Yes, from the billing settings in your admin panel — the same way you subscribed, online, at no cost. Your data stays viewable after canceling; you just can\u2019t add new data until you reactivate.' },
      { q: 'What happens if my payment fails?', a: 'We\u2019ll email the contact address on your account letting you know, and your account goes into a limited state until it\u2019s resolved. Update your payment method in billing settings and we\u2019ll retry the charge.' },
      { q: 'What\u2019s the referral program?', a: 'Every agency gets a referral code (find yours in Settings). Share it with other agencies — when someone you refer becomes a paying customer, you automatically get a free month.' }
    ]
  },
  {
    name: 'Privacy & Data',
    faqs: [
      { q: 'Is my agency\u2019s data private from other agencies?', a: 'Completely. Every agency is fully isolated — no other agency can see your roster, battles, posts, or any of your data. This is enforced at the database level, not just hidden in the interface.' },
      { q: 'Can I delete my agency and its data?', a: 'Yes. An admin can permanently delete the agency from the admin panel. This removes the agency and its associated data and can\u2019t be undone, so you\u2019ll be asked to confirm carefully.' },
      { q: 'How are our codes and PINs stored?', a: 'Admin codes, manager codes, and creator PINs are stored hashed (scrambled one-way), never in plain text. Treat them like passwords and don\u2019t share them.' }
    ]
  },
  {
    name: 'Notifications & Devices',
    faqs: [
      { q: 'Why aren\u2019t push notifications working on my iPhone?', a: 'iOS only allows push notifications for sites added to the Home Screen. Tap the Share icon in Safari, choose \u201cAdd to Home Screen,\u201d then reopen the app from there before enabling notifications.' },
      { q: 'Can I turn notifications off?', a: 'Yes, from the Profile tab — \u201cTurn off notifications.\u201d' },
      { q: 'What devices and browsers work?', a: 'Battle Room Clash runs in any modern browser on phone, tablet, or computer — no app store download needed. For the best experience on a phone (including push notifications on iPhone), add it to your Home Screen from your browser\u2019s Share menu.' }
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
      <Head><title>Help · Battle Room Clash</title></Head>
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
