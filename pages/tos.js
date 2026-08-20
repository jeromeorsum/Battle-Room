import Head from 'next/head';
// Terms of Service — structure adapted from the 37signals open-source
// policies (https://37signals.com/policies), used under CC BY 4.0, and
// modified to match how Battle Room actually works and to sit under
// Idaho law. Have an attorney review before relying on this at launch.
export default function TOS() {
  return (
    <div className="wrap">
      <Head><title>Terms of Service · Battle Room</title></Head>
      <div className="card">
        <h1>Terms of Service</h1>
        <p className="dim" style={{ marginBottom: 16 }}>Last updated: August 20, 2026</p>

        <p>When you create an agency, join a roster, or otherwise use Battle
        Room, you are agreeing to these Terms of Service (&quot;Terms&quot;).
        If you do not agree to them, do not use the Service. Violating these
        Terms may, at our discretion, result in suspension or termination of
        your account.</p>
        <p>We may update these Terms from time to time. If we make significant
        changes, we will refresh the date at the top of this page and notify
        agency owners at the contact email on their account. Continued use of
        the Service after a change takes effect constitutes acceptance of the
        updated Terms.</p>

        <h3>Definitions</h3>
        <p>&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or
        &quot;us&quot; refers to the operator of Battle Room, based in the
        State of Idaho. If a legal entity is formed to operate Battle Room,
        these Terms apply to that entity as the operator.</p>
        <p>&quot;Service&quot; refers to the Battle Room website and
        application — including the agency admin panel, the creator app, and
        any related pages we operate — used for scheduling and coordinating
        live battles between creators within an agency.</p>
        <p>&quot;You&quot; or &quot;your&quot; refers to the person or
        organization that owns an agency account, and where context requires,
        to team members and creators using the Service under that agency.</p>

        <h3>Eligibility — Adults Only</h3>
        <p>Battle Room is for adults. Every user — agency owners, team
        members, and creators — must be at least 18 years old. Signup and
        creator onboarding require an explicit age attestation, and agencies
        must not add creators they know or should know are under 18. If we
        become aware that a user is under 18, we will remove the account or
        profile.</p>

        <h3>Account terms</h3>
        <p>You are responsible for maintaining the security of your agency
        code, admin code, manager code, and creator PINs, and for ensuring
        your team members and creators do the same. Anyone who presents a
        valid code or PIN can act with the access it grants, so treat them
        like passwords. We are not liable for loss or damage resulting from a
        failure to keep credentials secure. We recommend enabling two-factor
        authentication where it is offered.</p>
        <p>The agency owner is responsible for all content posted and
        activity that occurs under the agency&apos;s account, including
        activity by team members and creators.</p>

        <h3>Free trial, automatic renewal, billing, and cancellation</h3>
        <p><b>How the free trial and automatic billing work.</b> When you start
        a subscription, you provide a valid payment method and begin a 14-day
        free trial. <b>We do not charge you during the trial.</b> Unless you
        cancel before the trial ends, your subscription automatically converts
        to a paid plan and your payment method is charged the then-current
        monthly price for your plan, and will be charged automatically on a
        recurring monthly basis thereafter until you cancel. You may cancel at
        any time before the trial ends to avoid being charged. The specific
        price, the date of your first charge, and the recurring billing terms
        are disclosed to you clearly and conspicuously on the signup screen,
        next to where you confirm your subscription, before you provide
        payment and give your consent.</p>
        <p><b>Your affirmative consent.</b> By checking the consent box and
        starting your subscription, you affirmatively agree to these
        automatic-renewal terms: that after the free trial your payment method
        will be charged automatically, on a recurring monthly basis, at the
        disclosed price, until you cancel.</p>
        <p><b>Reminder before your first charge.</b> As a courtesy and
        consistent with applicable law, before your free trial ends and your
        first charge occurs we send a reminder to the contact email on your
        account, stating that the trial is ending, the amount you will be
        charged, and the date of the charge, along with a link to cancel.</p>
        <p><b>How to cancel — free and easy, the same way you signed up.</b>
        You can cancel your subscription at any time, online, yourself, at no
        cost, from the billing settings in your admin panel — the same online
        method you used to subscribe. Cancellation is immediate and requires
        no call, no fee, and no explanation. In addition, you may cancel at no
        cost by emailing us at the address at the bottom of these Terms and
        asking us to cancel; that is a second, always-available cancellation
        method. Cancelling stops all future charges. If you cancel during the
        free trial, you are not charged at all.</p>
        <p><b>Payments and taxes.</b> Payments are processed by Stripe.
        Yearly plans (where offered) are billed up front at ten times the
        monthly rate. Plan prices and creator limits are shown on our pricing
        page; each plan includes a maximum roster size, and moving to a larger
        roster requires the corresponding plan. All fees are exclusive of
        taxes, levies, or duties imposed by taxing authorities; where we are
        required to collect such taxes we will collect and remit them,
        otherwise they are your responsibility.</p>
        <p><b>Price changes.</b> We may change our pricing. If a price change
        would affect your existing subscription, we will give you at least 30
        days notice to the contact email on your account before the new price
        takes effect, and you may cancel before then if you do not agree.</p>

        <h3>Referral credits</h3>
        <p>Agencies receive a referral code they may share. When a new agency
        signs up with your code and completes its first paid subscription, we
        credit your account one free month of your current plan, applied as a
        billing credit toward future invoices. One credit is granted per
        referred agency, credits have no cash value and are not transferable
        or redeemable for cash, and we may reverse credits and suspend
        accounts involved in self-referral schemes, fake signups, or other
        abuse of the referral program.</p>

        <h3>Cancellation and termination</h3>
        <p>You can cancel at any time, self-service, from the admin panel
        settings: cancelling your subscription stops future charges, and
        deleting your agency cancels any active subscription immediately and
        permanently deletes your agency&apos;s data — roster, battles, posts,
        and team logins. Deletion is immediate and cannot be undone, and we
        cannot recover that data afterward, so export anything you need
        before deleting. If you cancel partway through a billing period, we
        do not automatically prorate the remainder.</p>
        <p>We reserve the right to suspend or terminate accounts and refuse
        service for violations of these Terms, abuse of the Service (for
        example, attempting to access other agencies&apos; data, circumventing
        rate limits, or automated scraping), non-payment, or unlawful use.
        Verbal, written, or other abuse of Company staff will result in
        immediate termination. Where practical we will warn the account owner
        first, but we are not required to.</p>

        <h3>Acceptable use</h3>
        <p>You agree to use Battle Room only for organizing and coordinating
        live battles and managing your own agency&apos;s roster. You
        must not use the Service to harass anyone, post unlawful or abusive
        content, attempt to compromise the platform or other users&apos;
        accounts, probe or test the isolation between agencies, or interfere
        with other customers&apos; use of the Service. We do not pre-screen
        content, but we reserve the right (not the obligation) to remove any
        content and to moderate posts at our sole discretion.</p>

        <h3>Your content and our service</h3>
        <p>The information you and your creators submit — names, handles,
        diamond counts, schedules, posts — remains yours. You grant us a
        limited license to store, process, and display it solely to provide
        the Service. Each agency&apos;s data is isolated: your roster is not
        visible to other agencies on the platform.</p>
        <p>We own the Service itself, including its design, code, and
        branding, and you obtain no ownership rights in it by using it. You
        may not copy, resell, or exploit any portion of the Service without
        our written permission.</p>

        <h3>Privacy and data access</h3>
        <p>We store the information you provide in order to operate
        matchmaking, scheduling, notifications, and billing, as described in
        our <a href="/privacy" style={{ color: 'var(--cyan)' }}>Privacy
        Policy</a>. Our staff access customer data only to provide support
        you request, to investigate abuse or security incidents, to fix
        errors, or when required by applicable law. As a U.S. company, we
        disclose customer data to authorities only under a legally binding
        order.</p>

        <h3>Uptime and disclaimer of warranties</h3>
        <p>We take uptime seriously and publish current status on our <a
        href="/status" style={{ color: 'var(--cyan)' }}>status page</a>, but
        we do not offer a service-level agreement.</p>
        <p><b>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
        AVAILABLE&quot;, WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
        INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT. YOUR USE OF THE SERVICE IS
        AT YOUR SOLE RISK.</b></p>

        <h3>Limitation of liability</h3>
        <p><b>TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY WILL NOT BE
        LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
        PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, OR DATA, ARISING FROM
        YOUR USE OF (OR INABILITY TO USE) THE SERVICE, UNAUTHORIZED ACCESS TO
        YOUR DATA, OR THE CONDUCT OF ANY THIRD PARTY ON THE SERVICE. OUR
        TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE
        TERMS OR THE SERVICE IS LIMITED TO THE AMOUNTS YOU PAID US IN THE
        TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM.</b></p>
        <p>Some jurisdictions do not allow certain limitations, so parts of
        the above may not apply to you. Nothing in these Terms waives rights
        you may have under the Idaho Consumer Protection Act (Idaho Code
        § 48-601 et seq.) or other law that cannot be waived by
        agreement.</p>

        <h3>Governing law and venue</h3>
        <p>These Terms are governed by the laws of the State of Idaho,
        without regard to its conflict-of-law rules. Any dispute arising out
        of or relating to these Terms or the Service that the parties cannot
        resolve informally will be brought exclusively in the state or
        federal courts located in Canyon County, Idaho, and you consent to
        personal jurisdiction and venue there. Before filing anything, email
        us — most problems are faster to fix than to litigate.</p>

        <h3>General</h3>
        <p>If any provision of these Terms is found unenforceable, the
        remaining provisions stay in full effect. Our failure to enforce a
        provision is not a waiver of it. These Terms, together with our <a
        href="/privacy" style={{ color: 'var(--cyan)' }}>Privacy Policy</a>,
        are the entire agreement between you and the Company regarding the
        Service.</p>

        <p className="dim" style={{ marginTop: 24 }}>Questions about these
        Terms? Email <a href="mailto:support@battle-room.app"
        style={{ color: 'var(--cyan)' }}>support@battle-room.app</a>.</p>
        <p className="dim" style={{ fontSize: 12, marginTop: 8 }}>Portions of
        these Terms are adapted from the 37signals open-source policies,
        used under CC BY 4.0.</p>
      </div>
    </div>
  );
}
