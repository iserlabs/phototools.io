import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import bundleAnalyzer from '@next/bundle-analyzer'
import { withSentryConfig } from '@sentry/nextjs'
import { staticRedirects } from './src/lib/i18n/redirects'

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts')
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  async redirects() {
    return staticRedirects
  },
  async rewrites() {
    return [
      // Static JS bundles (recorder.js, feature-flags.js, etc.) and the per-project
      // config.js wrapper must come from the assets host so they arrive with
      // content-type: application/javascript. The ingest host serves the same
      // paths as JSON (or 404s), which the browser refuses to execute.
      { source: '/phog/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/phog/ingest/array/:path*', destination: 'https://us-assets.i.posthog.com/array/:path*' },
      // Ingest endpoints: /e/, /i/v0/e/, /decide, /flags, /capture, etc.
      // Note: this project lives on the US PostHog instance (phc_o9Zy… is not
      // registered at eu.i.posthog.com), so EU rewrites would 401/404.
      { source: '/phog/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ]
  },
  async headers() {
    // Vercel Live toolbar (feedback widget, comments, real-time presence) is
    // injected by the Vercel platform whenever the deployment is accessed via
    // a *.vercel.app URL. `VERCEL_ENV` reflects the *environment* (production
    // / preview / development), NOT the host the request came in on — pushes
    // to `main` are VERCEL_ENV='production' but still get a *.vercel.app
    // alias that serves the toolbar, so gating by env was wrong. Static
    // response headers can't see the request host, so we always allow the
    // first-party vercel.live origins. These are Vercel-owned and only load
    // when the platform actively injects the toolbar on deployment URLs.
    return [
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          // Privacy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },

          // Security
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://cdn-cookieyes.com https://va.vercel-scripts.com https://us-assets.i.posthog.com https://static.cloudflareinsights.com https://connect.facebook.net https://vercel.live`,
              "style-src 'self' 'unsafe-inline' https://vercel.live",
              "img-src 'self' blob: data: https://pagead2.googlesyndication.com https://www.google.com https://www.googletagmanager.com https://*.google-analytics.com https://googleads.g.doubleclick.net https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://cdn-cookieyes.com https://www.facebook.com https://vercel.live https://vercel.com",
              "font-src 'self' https://vercel.live https://assets.vercel.com",
              // `data:` lets @react-pdf/renderer fetch() its embedded fontkit/WASM
              // engine (shipped as a data: URI) during client-side PDF export.
              "connect-src 'self' blob: data: https://www.google.com https://analytics.google.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://cdn-cookieyes.com https://log.cookieyes.com https://us.i.posthog.com https://us-assets.i.posthog.com https://cloudflareinsights.com https://www.facebook.com https://vercel.live wss://ws-us3.pusher.com",
              "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://www.facebook.com https://vercel.live",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "worker-src 'self' blob:",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(withBundleAnalyzer(withNextIntl(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Route browser Sentry events through our server (bypasses ad blockers)
  tunnelRoute: '/monitoring',

  // Suppress source map upload logs except in CI
  silent: !process.env.CI,

  // Delete source maps after upload so browsers can't access them
  sourcemaps: {
    filesToDeleteAfterUpload: ['.next/static/**/*.map'],
  },
})
