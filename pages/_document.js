import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#0a0a0f" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Battle Room Clash" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Default social preview tags — individual pages can override any
            of these with their own <Head> (e.g. a page-specific title). */}
        <meta name="description" content="Battle Room Clash — book and manage live PK battles for your agency, all in one place." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Battle Room Clash" />
        <meta property="og:title" content="Battle Room Clash" />
        <meta property="og:description" content="Book and manage live PK battles for your agency, all in one place." />
        <meta property="og:image" content="https://www.battleroomclash.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Battle Room Clash" />
        <meta name="twitter:description" content="Book and manage live PK battles for your agency, all in one place." />
        <meta name="twitter:image" content="https://www.battleroomclash.com/og-image.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
