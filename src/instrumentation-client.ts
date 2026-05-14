import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Capture all errors (5K/month free tier)
  sampleRate: 1.0,

  // Performance: 10% in production, 1% in preview
  tracesSampleRate:
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.1 : 0.01,

  // Session replay disabled — PostHog covers this (5K/month free)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Browser-extension content scripts that hit our production CSP raise an
  // unactionable error here. The CSP is working as intended; drop the noise.
  ignoreErrors: [/unsafe-eval is not an allowed source of script/],
})

// Instrument App Router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
