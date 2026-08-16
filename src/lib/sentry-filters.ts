// Client-side Sentry `ignoreErrors` patterns.
//
// Each entry drops a class of *unactionable* browser noise — errors raised by
// browser extensions, in-app WebViews, content-injecting proxies, or RSC
// stream aborts, none of which our application code can fix. Kept here as pure
// data (rather than inline in `instrumentation-client.ts`) so the patterns can
// be unit-tested: a regex that silently never matches its real-world message
// is worse than no filter at all, because the noise keeps flowing while
// looking handled. See `sentry-filters.test.ts`.
//
// Sentry matches these against the exception value, the `Type: value` string,
// and `event.message`: regex entries via `.test()`, string entries via
// substring `.includes()`. Anchor regexes on the STABLE prefix of a message,
// never on a fragment that depends on quoting the browser may render
// differently across engines.
export const IGNORE_SENTRY_ERRORS: (string | RegExp)[] = [
  // Browser-extension content scripts that hit our production CSP raise an
  // unactionable EvalError here. The CSP is working as intended; drop the
  // noise. Anchor on the stable message prefix — the real message reads
  // `…because 'unsafe-eval' is not an allowed source…`, so a regex expecting
  // `unsafe-eval is` (no closing quote) silently never matched.
  /Refused to evaluate a string as JavaScript/,
  // React Server Components stream abort. React's flight client throws this
  // when the RSC payload connection closes before it finishes reading —
  // overwhelmingly caused by the user navigating away (or a prefetch being
  // cancelled, or a bot closing the socket early) mid-stream, not by app
  // code. A genuine server-side streaming failure surfaces separately in the
  // server-side Sentry instrumentation, so dropping it here only removes noise.
  'Connection closed.',
  // In-app browsers, old Android WebViews, and content-injecting
  // proxies/extensions splice a mangled script into the page — a raw
  // `https://…` URL pasted into a script context parses as a bare `https`
  // identifier and throws this SyntaxError. The global onerror handler
  // attributes it to the document URL at line 1 with no chunk file in the
  // stack, confirming it isn't our bundle (which never emits an unquoted
  // `https` token), so this only drops third-party injection noise.
  /Unexpected identifier 'https'/,
  // Safari cancels in-flight App Router prefetches when the user navigates,
  // and the aborted fetch rejects with `undefined`; Sentry's global
  // onunhandledrejection handler wraps that as this synthesized message
  // (PHOTOTOOLS-Q — breadcrumbs show the failed `GET /en?_rsc=…` immediately
  // before every event). Anchored on `undefined$` so a non-Error rejection
  // carrying a REAL value — which may implicate app code — still reports.
  /Non-Error promise rejection captured with value: undefined$/,
  // Brave for iOS injecting its own userScript bridge into the page's global
  // scope (PHOTOTOOLS-S: `window.__firefox__.reader` read off an undefined
  // namespace; PHOTOTOOLS-T: a bare `__firefox__` reference in the same
  // session). Brave's iOS browser is a fork of Firefox for iOS, so it still
  // injects its WKWebView scripts under the inherited `__firefox__` namespace —
  // which is why a Brave-tagged event names Firefox. The injection lost its
  // race with the page on this device and threw; `window.onerror` catches
  // anything in page global scope regardless of origin, so Sentry attributes a
  // browser-internal crash to our release. Every event was `browser: Brave` on
  // iOS, and the frames sit at the DOCUMENT url line 1 (`app:///en/…:1:19`,
  // `global code`) rather than in one of our `_next/static/chunks` bundles —
  // both confirming it isn't our code. Anchored on the injected identifier
  // itself, never on WebKit's generic `Can't find variable:` / `undefined is
  // not an object` phrasing, which our own bundle's real errors also use.
  /__firefox__/,
  // Brave Wallet's Ethereum provider injection failing the same way, in the
  // same iOS session (`window.ethereum.selectedAddress = undefined` assigned
  // onto an undefined provider). We ship no web3 code whatsoever, so any event
  // naming `window.ethereum` originates in a wallet extension or a wallet-
  // bundling browser, never in ours.
  /window\.ethereum/,
  // Firefox skipping a React view transition in a backgrounded tab
  // (PHOTOTOOLS-V). The spec REQUIRES the browser to skip a transition started
  // while `document.visibilityState === 'hidden'` and reject `ready` with an
  // InvalidStateError, so this fires whenever a visitor opens a tool in a
  // background tab (every event so far: Firefox, referrer google.com) and
  // something commits an update inside the `<ViewTransition>` in
  // `[locale]/layout.tsx`. Nothing is wrong — the browser declined to animate
  // an invisible page and React committed the update without animation.
  //
  // It reaches Sentry only because of a gap in React itself:
  // `customizeViewTransitionError` (react-dom-client, vendored by Next) swallows
  // this exact condition by matching the DOMException's message against a
  // hardcoded list — but that list only carries Chromium's and WebKit's
  // wordings ("View transition was skipped because document visibility state is
  // hidden.", "Transition was aborted because of invalid state", …), not Gecko's.
  // Unmatched, the error falls through to `onRecoverableError` → Next's
  // `reportGlobalError` → `reportError()`, which synthesizes an uncaught error
  // and trips Sentry's global onerror handler. We cannot patch vendored React,
  // and the throw never passes through our own frames, so a message filter is
  // the only lever. Remove this once React's allowlist learns Gecko's string.
  //
  // Anchored on the skip message, NOT the `InvalidStateError` type — our canvas,
  // WebGL, and IndexedDB paths raise that type for genuine faults that must keep
  // reporting. Left unanchored at the end so a trailing period, if Gecko ever
  // adds one, still matches.
  /Skipped ViewTransition due to document being hidden/,
]

// Client-side Sentry `denyUrls` patterns — drop any event whose throwing frame
// originates in a third-party script we neither ship nor can patch. Unlike
// `IGNORE_SENTRY_ERRORS` (which matches the message), these match the culprit
// frame's URL, so they suppress only the vendor's frames and never a same-named
// error thrown by our own bundle.
//
// Sentry matches denyUrls against the URL of the last valid stack frame: regex
// entries via `.test()`, string entries via substring `.includes()`.
export const SENTRY_DENY_URLS: (string | RegExp)[] = [
  // CookieYes consent banner — cdn-cookieyes.com/client_data/<id>/banner.js.
  // Its "Reject All" click handler reads window.localStorage, which throws an
  // unhandled SecurityError when the browser blocks site storage (e.g. Chrome
  // with cookies disabled — issue 7563162234). The consent flow still works and
  // we can't fix vendor code, so this is pure noise. Match the domain AND the
  // stable file path, so the filter holds whether Sentry keeps the full URL or
  // normalizes it to `app:///client_data/<id>/banner.js`.
  /cdn-cookieyes\.com/i,
  /\/client_data\/[^/]+\/banner\.js/i,
]

// Scraper bots drive the site with Playwright and `evaluate()` their own
// crawler scripts in the page; when those scripts crash (PHOTOTOOLS-9: a
// "LinkCollector" link-harvester died on `.trim()` of undefined), the global
// handlers attribute the error to our origin and Sentry reports it. The
// message is far too generic to ignore and the frames are eval'd (no URL for
// denyUrls to match), so we key on the one stable marker: Playwright's
// injected eval wrapper, `UtilityScript`, which appears as the frame FUNCTION
// name in every such stack and never in a real visitor's. Our own Playwright
// e2e runs never report — Sentry's DSN is unset outside Vercel deploys.
const BOT_AUTOMATION_FRAME = /\bUtilityScript\./

// Shape-compatible with Sentry's ErrorEvent without importing SDK types into
// a module that instrumentation-client.ts loads before Sentry.init runs.
interface FrameCarryingEvent {
  exception?: { values?: { stacktrace?: { frames?: { function?: string }[] } }[] }
}

export function isBotAutomationEvent(event: FrameCarryingEvent): boolean {
  const values = event.exception?.values ?? []
  return values.some((value) =>
    (value.stacktrace?.frames ?? []).some(
      (frame) => frame.function !== undefined && BOT_AUTOMATION_FRAME.test(frame.function),
    ),
  )
}
