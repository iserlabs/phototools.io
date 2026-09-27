import type { Redirect } from 'next/dist/lib/load-custom-routes'

/**
 * Static redirects — consumed by next.config.ts `redirects()`.
 * Dynamic locale routing is handled by routing middleware (src/proxy.ts).
 */
export const staticRedirects: Redirect[] = [
  // Legacy /tools/* URLs → root-level (middleware will then add locale prefix)
  {
    source: '/tools/:slug',
    destination: '/:slug',
    permanent: true,
  },
  // 2026-09: Color Scheme Generator was rebuilt and renamed to Color Analyzer.
  // Config redirects run before the locale proxy, so cover both shapes.
  { source: '/color-scheme-generator', destination: '/color-analyzer', permanent: true },
  { source: '/:locale/color-scheme-generator', destination: '/:locale/color-analyzer', permanent: true },
  // Old domain redirect
  {
    source: '/',
    has: [{ type: 'host', value: 'fov-viewer.iser.io' }],
    destination: 'https://www.phototools.io/fov-simulator',
    permanent: true,
  },
  {
    source: '/:path*',
    has: [{ type: 'host', value: 'fov-viewer.iser.io' }],
    destination: 'https://www.phototools.io/fov-simulator',
    permanent: true,
  },
]
