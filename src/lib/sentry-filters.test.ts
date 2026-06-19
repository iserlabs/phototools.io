import { describe, it, expect } from 'vitest'
import { IGNORE_SENTRY_ERRORS, SENTRY_DENY_URLS } from './sentry-filters'

// Mirror of Sentry's own matching (eventFilters.ts / string.ts): an event is
// dropped if ANY ignore pattern matches ANY of its candidate messages — the
// bare exception value and the `Type: value` string. Regex patterns use
// `.test()`, string patterns use substring `.includes()`. Keeping this in sync
// with the SDK is the whole point of the test: it proves each pattern actually
// fires against the real-world message it was written for.
function isIgnored(type: string, value: string): boolean {
  const candidates = [value, `${type}: ${value}`]
  return candidates.some((message) =>
    IGNORE_SENTRY_ERRORS.some((pattern) =>
      typeof pattern === 'string'
        ? message.includes(pattern)
        : pattern.test(message),
    ),
  )
}

describe('IGNORE_SENTRY_ERRORS', () => {
  it('every entry is a string or RegExp', () => {
    expect(IGNORE_SENTRY_ERRORS.length).toBeGreaterThan(0)
    for (const pattern of IGNORE_SENTRY_ERRORS) {
      expect(['string', 'object']).toContain(typeof pattern)
      if (typeof pattern !== 'string') expect(pattern).toBeInstanceOf(RegExp)
    }
  })

  // Real messages seen in production (verbatim values from the browser engines
  // that raise them). If a pattern is ever edited into one that no longer
  // matches its message — the silent-filter bug this module exists to prevent —
  // the corresponding case here fails loudly.
  describe('drops unactionable browser noise', () => {
    const noise: [name: string, type: string, value: string][] = [
      [
        'CSP unsafe-eval refusal (browser-extension content script)',
        'EvalError',
        `Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive: "script-src 'self'".`,
      ],
      ['RSC stream abort', 'Error', 'Connection closed.'],
      [
        'in-app WebView https injection (issue 7556617342)',
        'SyntaxError',
        "Unexpected identifier 'https'",
      ],
    ]

    it.each(noise)('drops: %s', (_name, type, value) => {
      expect(isIgnored(type, value)).toBe(true)
    })
  })

  // The filters must stay narrow: a genuine app error — including syntax errors
  // that AREN'T the https-injection signature — has to reach Sentry.
  describe('keeps genuine, actionable errors', () => {
    const real: [name: string, type: string, value: string][] = [
      [
        'app TypeError',
        'TypeError',
        "Cannot read properties of undefined (reading 'map')",
      ],
      ['old-browser optional chaining in our bundle', 'SyntaxError', "Unexpected token '.'"],
      ['genuine async syntax error in our bundle', 'SyntaxError', "Unexpected identifier 'await'"],
      ['network failure', 'Error', 'Failed to fetch'],
      ['unrelated React error', 'Error', 'Minified React error #418'],
    ]

    it.each(real)('keeps: %s', (_name, type, value) => {
      expect(isIgnored(type, value)).toBe(false)
    })
  })
})

// Mirror of Sentry's denyUrls matching (eventFilters.ts): an event is dropped
// when the URL of its throwing frame matches any pattern — regex via `.test()`,
// strings via substring `.includes()`.
function isUrlDenied(url: string): boolean {
  return SENTRY_DENY_URLS.some((pattern) =>
    typeof pattern === 'string' ? url.includes(pattern) : pattern.test(url),
  )
}

describe('SENTRY_DENY_URLS', () => {
  it('every entry is a string or RegExp', () => {
    expect(SENTRY_DENY_URLS.length).toBeGreaterThan(0)
    for (const pattern of SENTRY_DENY_URLS) {
      expect(['string', 'object']).toContain(typeof pattern)
      if (typeof pattern !== 'string') expect(pattern).toBeInstanceOf(RegExp)
    }
  })

  // The CookieYes consent banner reads window.localStorage in its "Reject All"
  // handler and throws an unhandled SecurityError when the browser blocks
  // storage (issue 7563162234). We can't patch the vendor script, so drop any
  // error whose throwing frame is the banner. Match both the raw CDN URL and
  // the app:///-normalized form Sentry may produce.
  describe('drops third-party CookieYes frames', () => {
    const denied: [name: string, url: string][] = [
      ['raw CDN url', 'https://cdn-cookieyes.com/client_data/283b952854e49874ccae7833ef9ba02a/banner.js'],
      ['app:///-normalized form', 'app:///client_data/283b952854e49874ccae7833ef9ba02a/banner.js'],
    ]
    it.each(denied)('denies: %s', (_name, url) => {
      expect(isUrlDenied(url)).toBe(true)
    })
  })

  // Must stay narrow: errors thrown by our own bundle (including our own
  // guarded/unguarded localStorage access) have to reach Sentry.
  describe('keeps our own frames', () => {
    const kept: [name: string, url: string][] = [
      ['our hashed chunk', 'https://www.phototools.io/_next/static/chunks/0jzaflnjbojrn.js'],
      ['our app frame', 'app:///src/app/[locale]/dof-simulator/_components/DofSimulator.tsx'],
      ['unrelated third party', 'https://connect.facebook.net/en_US/fbevents.js'],
    ]
    it.each(kept)('keeps: %s', (_name, url) => {
      expect(isUrlDenied(url)).toBe(false)
    })
  })
})
