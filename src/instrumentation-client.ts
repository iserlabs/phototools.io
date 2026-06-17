import * as Sentry from '@sentry/nextjs'
import { IGNORE_SENTRY_ERRORS } from '@/lib/sentry-filters'

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

  // Unactionable browser noise (extensions, in-app WebViews, RSC stream
  // aborts). Kept in a tested module so a typo'd pattern can't silently let
  // the noise through — see src/lib/sentry-filters.ts.
  ignoreErrors: IGNORE_SENTRY_ERRORS,
})

// Instrument App Router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
