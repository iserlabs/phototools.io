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
