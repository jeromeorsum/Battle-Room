/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self' https://*.ingest.us.sentry.io https://*.ingest.sentry.io",
      "frame-ancestors 'none'"
    ].join('; ')
  }
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};

module.exports = nextConfig;

// Wraps the config with Sentry's Next.js plugin — this handles uploading
// source maps and instrumenting the build automatically. It's safe to run
// even without a Sentry auth token set (it just skips the source map
// upload step in that case, error tracking itself still works).
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(module.exports, {
  silent: true,
  org: 'battle-room',
  project: 'javascript-nextjs',
  // Don't let a missing/misconfigured Sentry auth token break your build.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true
});
