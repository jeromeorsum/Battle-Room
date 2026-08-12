import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Only send a fraction of normal traces to stay comfortably on the free
  // tier — errors themselves are always captured regardless of this.
  tracesSampleRate: 0.1,
  // Don't let dev/local testing spam your real Sentry project.
  enabled: process.env.NODE_ENV === 'production'
});
