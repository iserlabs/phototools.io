import { describe, it, expect } from 'vitest'
import type { ErrorEvent } from '@sentry/nextjs'
import {
  IGNORE_SENTRY_ERRORS,
  SENTRY_DENY_URLS,
  isBotAutomationEvent,
  isForeignScriptEvent,
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
      [
        'injected-script M_ID read, Chromium phrasing (PHOTOTOOLS-Y/Z)',
        'TypeError',
        "Cannot read properties of undefined (reading 'M_ID')",
      ],
      [
        'injected-script M_ID read, WebKit phrasing',
        'TypeError',
        "undefined is not an object (evaluating 'e.M_ID')",
      ],
      [
        'MetaMask inpage bridge failing to restore its session (PHOTOTOOLS-P)',
        'i',
        'Failed to connect to MetaMask',
      ],
      [
        'MetaMask inpage bridge, linked cause (PHOTOTOOLS-P)',
        'Error',
        'MetaMask extension not found',
      ],
      [
        'Microsoft Outlook SafeLinks / CefSharp bridge rejection (PHOTOTOOLS-X)',
        'UnhandledRejection',
        'Non-Error promise rejection captured with value: Object Not Found Matching Id:2, MethodName:update, ParamCount:4',
      ],
      [
        'ResizeObserver frame bounce, old Chromium wording (PHOTOTOOLS-12)',
        'Error',
        'ResizeObserver loop limit exceeded',
      ],
      [
        'ResizeObserver frame bounce, current wording',
        'Error',
        'ResizeObserver loop completed with undelivered notifications.',
      ],
      // gtag.js's own measurement beacons failing (ad blocker, privacy
      // extension, offline). Sentry's fetch instrumentation appends the request
      // host to the browser's network-failure message, so the value names the
      // vendor (issues 7799120710 / 7799120686 / 7799120786).
      [
        'gtag beacon blocked, Chromium wording (7799120710)',
        'TypeError',
        'Failed to fetch (www.google-analytics.com)',
      ],
      [
        'gtag beacon blocked, regional collection host',
        'TypeError',
        'Failed to fetch (region1.google-analytics.com)',
      ],
      [
        'gtag beacon blocked, WebKit wording',
        'TypeError',
        'Load failed (www.google-analytics.com)',
      ],
      [
        'gtag beacon blocked, Gecko wording',
        'TypeError',
        'NetworkError when attempting to fetch resource. (www.google-analytics.com)',
      ],
      [
        'gtag request to the tag-manager host blocked',
        'TypeError',
        'Failed to fetch (www.googletagmanager.com)',
      ],
      [
        'gtag request to the GA4 collection host blocked',
        'TypeError',
        'Failed to fetch (analytics.google.com)',
      ],
      // WebKit's wording of the hidden-document view-transition skip, which
      // React's exact-match allowlist misses (issue 7756075157). Sentry
      // reports a stackless DOMException as `Error` with `Name: message`, so
      // both shapes are covered.
      [
        'WebKit hidden-document view-transition skip, DOMException shape (7756075157)',
        'Error',
        'InvalidStateError: Transition was aborted because of invalid state. Document hidden',
      ],
      [
        'WebKit hidden-document view-transition skip, typed shape',
        'InvalidStateError',
        'Transition was aborted because of invalid state. Document hidden',
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
      // The gtag filter keys on the Google Analytics HOST Sentry appends —
      // failed fetches to our own origin or any other vendor keep reporting,
      // and look-alike hosts can't borrow the suffix.
      ['failed fetch to our own origin', 'TypeError', 'Failed to fetch (www.phototools.io)'],
      ['failed fetch to our own API, WebKit wording', 'TypeError', 'Load failed (www.phototools.io)'],
      ['failed fetch to PostHog', 'TypeError', 'Failed to fetch (us.i.posthog.com)'],
      ['look-alike host prefix', 'TypeError', 'Failed to fetch (notgoogle-analytics.com)'],
      ['look-alike host suffix', 'TypeError', 'Failed to fetch (www.google-analytics.com.example.net)'],
      ['bare WebKit network failure', 'TypeError', 'Load failed'],
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
      // The M_ID filter keys on the exact identifier — near-miss property names
      // our own code could plausibly read must keep reporting.
      [
        'app null-deref on a different _ID-suffixed property',
        'TypeError',
        "Cannot read properties of undefined (reading 'TEAM_ID')",
      ],
      [
        'app null-deref on lowercase id',
        'TypeError',
        "Cannot read properties of undefined (reading 'id')",
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

  // Google's AdSense RUM script throws `Error: int64` from its own
  // visibilitychange listener when Safari 26.6 hands it a timing value it can't
  // encode (PHOTOTOOLS-11: every frame below Sentry's listener wrapper is
  // pagead/js/…/rum_fy2021.js, and the script literally reads
  // `throw Ia("int64")`). Vendor code, not ours — drop by frame URL. Match the
  // googlesyndication host AND the /pagead/js/ path, since Sentry normalizes
  // the frame to `app:///pagead/js/…` and strips the host.
  describe('drops third-party Google ad-script frames', () => {
    const denied: [name: string, url: string][] = [
      ['raw AdSense RUM url', 'https://pagead2.googlesyndication.com/pagead/js/r20260909/r20190131/rum_fy2021.js'],
      ['app:///-normalized form', 'app:///pagead/js/r20260909/r20190131/rum_fy2021.js'],
      ['AdSense loader', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'],
      ['ad frame host', 'https://tpc.googlesyndication.com/sodar/sodar2.js'],
    ]
    it.each(denied)('denies: %s', (_name, url) => {
      expect(isUrlDenied(url)).toBe(true)
    })
  })

  // Browser-extension content/inpage scripts run in the page's global scope,
  // so their crashes trip our global handlers and get attributed to our
  // release (PHOTOTOOLS-P: MetaMask's inpage.js). Sentry's own docs recommend
  // denying the extension URL schemes outright — nothing we ship ever loads
  // from one.
  describe('drops browser-extension frames', () => {
    const denied: [name: string, url: string][] = [
      ['MetaMask inpage script (Chrome)', 'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/scripts/inpage.js'],
      ['Firefox extension', 'moz-extension://5a9f2b1c-1234-4c8d-9e1f-abcdef123456/content.js'],
      ['Safari web extension', 'safari-web-extension://ABCDEF12-3456-7890-ABCD-EF1234567890/inject.js'],
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

// Events raised by scripts injected into the page WITHOUT a source URL —
// WKWebView user scripts evaluated by the browser itself, eval'd payloads
// from extensions or proxies — so the throwing frames carry no script file
// at all (PHOTOTOOLS-14/15/16/17: one Chrome-for-iOS session, es-MX visitor
// on /en/exposure-simulator, four errors inside 44 s). The messages are
// minified identifiers (`pa`, `La`, `` Ka`prod ``) that change with every
// build of the injected script, so a message filter would go stale at once;
// the stable signal is the frame shape. Verified against the deployed
// release: no chunk contains those strings, the longest chunk is 128 lines,
// and the HTML document is a single line — so "document line 415" and
// "undefined line 199" cannot be ours.
interface FrameShape { filename?: string; function?: string; lineno?: number; colno?: number }

function makeGlobalHandlerEvent(
  mechanism: string,
  type: string,
  value: string,
  frames?: FrameShape[],
  handled = false,
): ErrorEvent {
  return {
    exception: {
      values: [
        {
          type,
          value,
          mechanism: { type: mechanism, handled },
          ...(frames ? { stacktrace: { frames } } : {}),
        },
      ],
    },
  } as ErrorEvent
}

const ONERROR = 'auto.browser.global_handlers.onerror'
const ONREJECTION = 'auto.browser.global_handlers.onunhandledrejection'

describe('isForeignScriptEvent', () => {
  describe('drops the observed URL-less injected-script shapes', () => {
    it('PHOTOTOOLS-17: RangeError whose only frame is filename "undefined"', () => {
      const event = makeGlobalHandlerEvent(ONERROR, 'RangeError', 'Maximum call stack size exceeded.', [
        { filename: 'undefined', lineno: 199, colno: 363 },
      ])
      expect(isForeignScriptEvent(event)).toBe(true)
    })

    it('PHOTOTOOLS-15: rejection whose frames are all [native code] Promise', () => {
      const native = { filename: '[native code]', function: 'Promise' }
      const event = makeGlobalHandlerEvent(ONREJECTION, 'Error', 'Ka`prod', [native, native, native])
      expect(isForeignScriptEvent(event)).toBe(true)
    })

    it('PHOTOTOOLS-14: onerror attributed to the HTML document at a line it does not have', () => {
      const event = makeGlobalHandlerEvent(ONERROR, 'Error', 'pa', [
        { filename: 'app:///en/exposure-simulator', lineno: 415, colno: 45 },
      ])
      expect(isForeignScriptEvent(event)).toBe(true)
    })

    it('PHOTOTOOLS-16: frameless rejection of a bare minified identifier', () => {
      expect(isForeignScriptEvent(makeGlobalHandlerEvent(ONREJECTION, 'Error', 'La'))).toBe(true)
    })

    // PHOTOTOOLS-17 regression (2026-10-24, release 91c46fa0): the same
    // injected recursion, now in a V8 browser (no trailing period), thrown
    // inside a callback the page handed to a Sentry-wrapped browser API.
    // browserApiErrors captures it with its own mechanism and suppresses the
    // duplicate onerror report, so the event never carries global_handlers.
    // A stack overflow fills V8's 10-frame stack limit with the recursing
    // function, so every frame is the same sourceless location.
    const recursingFrames = Array.from({ length: 10 }, () => ({ filename: 'undefined', lineno: 199, colno: 363 }))

    it.each([
      'auto.browser.browserapierrors.setTimeout',
      'auto.browser.browserapierrors.setInterval',
      'auto.browser.browserapierrors.requestAnimationFrame',
      'auto.browser.browserapierrors.handleEvent',
      'auto.browser.browserapierrors.addEventListener',
      'auto.browser.browserapierrors.xhr.onreadystatechange',
    ])('PHOTOTOOLS-17 regression: sourceless RangeError raised through %s', (mechanism) => {
      const event = makeGlobalHandlerEvent(mechanism, 'RangeError', 'Maximum call stack size exceeded', recursingFrames)
      expect(isForeignScriptEvent(event)).toBe(true)
    })

    it('V8 <anonymous> frames raised through a wrapped timer', () => {
      const event = makeGlobalHandlerEvent('auto.browser.browserapierrors.setTimeout', 'RangeError', 'Maximum call stack size exceeded', [
        { filename: '<anonymous>', function: 'n', lineno: 199, colno: 363 },
        { filename: '<anonymous>', function: 'n', lineno: 199, colno: 363 },
      ])
      expect(isForeignScriptEvent(event)).toBe(true)
    })

    it('raw (pre-normalization) document URL is treated the same as app:///', () => {
      const event = makeGlobalHandlerEvent(ONERROR, 'Error', 'pa', [
        { filename: 'https://www.phototools.io/en/exposure-simulator', lineno: 415, colno: 45 },
      ])
      expect(isForeignScriptEvent(event)).toBe(true)
    })
  })

  describe('keeps everything that can implicate our own code', () => {
    it('the same RangeError raised from one of our chunks', () => {
      const event = makeGlobalHandlerEvent(ONERROR, 'RangeError', 'Maximum call stack size exceeded.', [
        { filename: 'app:///_next/static/immutable/chunks/0k5f-ok8pxuvq.js', function: 'r', lineno: 1, colno: 8812 },
        { filename: 'app:///_next/static/immutable/chunks/0k5f-ok8pxuvq.js', function: 'r', lineno: 1, colno: 8812 },
      ])
      expect(isForeignScriptEvent(event)).toBe(false)
    })

    it('a stack overflow in our own chunk raised through a wrapped browser API', () => {
      const ours = { filename: 'app:///_next/static/immutable/chunks/0k5f-ok8pxuvq.js', function: 'r', lineno: 1, colno: 8812 }
      const event = makeGlobalHandlerEvent('auto.browser.browserapierrors.requestAnimationFrame', 'RangeError', 'Maximum call stack size exceeded', [ours, ours])
      expect(isForeignScriptEvent(event)).toBe(false)
    })

    it('a wrapped-API event with even one frame from our bundle', () => {
      const event = makeGlobalHandlerEvent('auto.browser.browserapierrors.handleEvent', 'TypeError', 'boom', [
        { filename: 'undefined', lineno: 199 },
        { filename: 'https://www.phototools.io/_next/static/chunks/15996ofnfz0ei.js', function: 'onClick', lineno: 1, colno: 22 },
      ])
      expect(isForeignScriptEvent(event)).toBe(false)
    })

    it('other auto-instrumentation mechanisms, and handled wrapped-API events, are out of scope', () => {
      const sourceless = [{ filename: 'undefined', lineno: 199, colno: 363 }]
      const value = 'Maximum call stack size exceeded'
      expect(isForeignScriptEvent(makeGlobalHandlerEvent('auto.http.client.fetch', 'RangeError', value, sourceless))).toBe(false)
      expect(isForeignScriptEvent(makeGlobalHandlerEvent('auto.browser.browserapierrors.setTimeout', 'RangeError', value, sourceless, true))).toBe(false)
    })

    it('a mixed stack with even one frame from our bundle', () => {
      const event = makeGlobalHandlerEvent(ONREJECTION, 'Error', 'boom', [
        { filename: '[native code]', function: 'Promise' },
        { filename: 'app:///_next/static/immutable/chunks/15996ofnfz0ei.js', function: 'handleExport', lineno: 1, colno: 22 },
      ])
      expect(isForeignScriptEvent(event)).toBe(false)
    })

    it('an inline script on the document at line 1 (our own inline scripts live there)', () => {
      const event = makeGlobalHandlerEvent(ONERROR, 'TypeError', "undefined is not an object (evaluating 'window.__firefox__.reader')", [
        { filename: 'app:///en/fov-simulator', lineno: 1, colno: 19 },
      ])
      expect(isForeignScriptEvent(event)).toBe(false)
    })

    it('anything we captured explicitly, whatever its frames look like', () => {
      const event = makeGlobalHandlerEvent('generic', 'Error', 'pa', [{ filename: 'undefined', lineno: 199 }], true)
      expect(isForeignScriptEvent(event)).toBe(false)
    })

    it('a frameless DOMException from a native API (PHOTOTOOLS-13 shape)', () => {
      const event = makeGlobalHandlerEvent(ONREJECTION, 'NotFoundError', 'The object can not be found here.')
      expect(isForeignScriptEvent(event)).toBe(false)
    })

    it('a frameless Error carrying a real sentence', () => {
      expect(isForeignScriptEvent(makeGlobalHandlerEvent(ONREJECTION, 'Error', 'Failed to fetch'))).toBe(false)
      expect(isForeignScriptEvent(makeGlobalHandlerEvent(ONREJECTION, 'Error', 'Minified React error #418'))).toBe(false)
    })

    it('a frameless non-Error rejection (Sentry synthesises these for primitives)', () => {
      const event = makeGlobalHandlerEvent(ONREJECTION, 'UnhandledRejection', 'Non-Error promise rejection captured with value: oops')
      expect(isForeignScriptEvent(event)).toBe(false)
    })

    it('events with no exception at all', () => {
      expect(isForeignScriptEvent({} as ErrorEvent)).toBe(false)
      expect(isForeignScriptEvent({ exception: { values: [] } } as unknown as ErrorEvent)).toBe(false)
    })
  })
})
