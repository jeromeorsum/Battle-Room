import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0f" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Battle Room" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Default social preview tags — individual pages can override any
            of these with their own <Head> (e.g. a page-specific title). */}
        <meta name="description" content="Battle Room — book and manage live creator battles for your agency, all in one place." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Battle Room" />
        <meta property="og:title" content="Battle Room" />
        <meta property="og:description" content="Book and manage live creator battles for your agency, all in one place." />
        <meta property="og:image" content="https://battle-room.vercel.app/icon-192.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Battle Room" />
        <meta name="twitter:description" content="Book and manage live creator battles for your agency, all in one place." />
        <meta name="twitter:image" content="https://battle-room.vercel.app/icon-192.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
