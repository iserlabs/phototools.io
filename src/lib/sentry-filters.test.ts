import { describe, it, expect } from 'vitest'
import type { ErrorEvent } from '@sentry/nextjs'
import {
  IGNORE_SENTRY_ERRORS,
  SENTRY_DENY_URLS,
  isBotAutomationEvent,
} from './sentry-filters'

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
      [
        'Safari-aborted RSC prefetch rejecting with undefined (PHOTOTOOLS-Q)',
        'UnhandledRejection',
        'Non-Error promise rejection captured with value: undefined',
      ],
      [
        'Brave iOS __firefox__ userScript bridge, missing namespace (PHOTOTOOLS-S)',
        'TypeError',
        "undefined is not an object (evaluating 'window.__firefox__.reader')",
      ],
      [
        'Brave iOS __firefox__ userScript bridge, bare reference (PHOTOTOOLS-T)',
        'ReferenceError',
        "Can't find variable: __firefox__",
      ],
      [
        'Brave iOS wallet provider injection',
        'TypeError',
        "undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')",
      ],
      [
        'Firefox skipping a view transition in a hidden tab (PHOTOTOOLS-V)',
        'InvalidStateError',
        'Skipped ViewTransition due to document being hidden',
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
      // A non-Error rejection carrying an actual VALUE may point at app code
      // rejecting with a string/object — only the bare `undefined` shape is
      // provably the Safari prefetch abort, so everything else must flow.
      [
        'non-Error rejection with a real value',
        'UnhandledRejection',
        'Non-Error promise rejection captured with value: Object Not Found Matching Id:3',
      ],
      // The Brave-injection filters key on the injected global's NAME, never on
      // WebKit's generic phrasing — otherwise they would swallow every
      // ReferenceError and null-deref Safari reports from our own bundle.
      [
        'WebKit null-deref in our own bundle',
        'TypeError',
        "undefined is not an object (evaluating 'this.canvas.getContext')",
      ],
      [
        'WebKit missing global in our own bundle',
        'ReferenceError',
        "Can't find variable: gtag",
      ],
      // The view-transition filter keys on the SKIP message, never on the
      // `InvalidStateError` type — our own canvas/IndexedDB/WebGL code raises
      // that type for real faults the Lightroom analyzer and export paths must
      // keep reporting.
      [
        'genuine InvalidStateError from our own IndexedDB code',
        'InvalidStateError',
        "Failed to execute 'transaction' on 'IDBDatabase': A version change transaction is running.",
      ],
      [
        'genuine InvalidStateError from a detached canvas export',
        'InvalidStateError',
        "Failed to execute 'getImageData' on 'CanvasRenderingContext2D': The canvas has been detached.",
      ],
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

// Events raised by scraper bots that drive the site with Playwright and
// evaluate their own crawler script in the page (issue PHOTOTOOLS-9: a
// "LinkCollector" script crashing on `.trim()` of undefined). Playwright's
// injected eval wrapper — `UtilityScript.evaluate` — appears in the stack of
// every such error, and never in a real visitor's, so it is the drop signal.
// The message alone ("Cannot read properties of undefined…") is far too
// generic to ignore, which is why this is a frame filter, not a message one.
function makeFrameEvent(functions: (string | undefined)[]): ErrorEvent {
  return {
    exception: {
      values: [
        {
          type: 'TypeError',
          value: "Cannot read properties of undefined (reading 'trim')",
          stacktrace: { frames: functions.map((fn) => ({ function: fn })) },
        },
      ],
    },
  } as ErrorEvent
}

describe('isBotAutomationEvent', () => {
  it('drops the observed PHOTOTOOLS-9 Playwright LinkCollector stack', () => {
    // Verbatim frame functions from the production event (oldest → newest).
    const event = makeFrameEvent([
      'UtilityScript.<anonymous>',
      'UtilityScript.evaluate',
      'eval',
      'window.startLinkCollector',
      'SimPaginationDetector.detect',
      'Array.forEach',
      'eval',
    ])
    expect(isBotAutomationEvent(event)).toBe(true)
  })

  it('drops any stack containing a UtilityScript frame', () => {
    expect(isBotAutomationEvent(makeFrameEvent(['UtilityScript.evaluate']))).toBe(true)
  })

  it('keeps the same TypeError raised by our own components', () => {
    const event = makeFrameEvent(['onClick', 'DofSimulator', 'renderWithHooks'])
    expect(isBotAutomationEvent(event)).toBe(false)
  })

  it('keeps events with anonymous/missing frame functions', () => {
    expect(isBotAutomationEvent(makeFrameEvent([undefined, '<anonymous>', 'eval']))).toBe(false)
  })

  it('keeps events with no stacktrace at all', () => {
    expect(isBotAutomationEvent({ exception: { values: [{ type: 'Error', value: 'x' }] } } as ErrorEvent)).toBe(false)
    expect(isBotAutomationEvent({} as ErrorEvent)).toBe(false)
  })
})
