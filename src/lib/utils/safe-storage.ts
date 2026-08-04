// Guarded localStorage access. iOS/macOS Safari with "Block All Cookies"
// (and some hardened WebViews) throws a SecurityError on ANY localStorage
// access — including reading the `window.localStorage` property itself, which
// is why the property access sits INSIDE the try, not just the method call
// (Sentry PHOTOTOOLS-R: ThemeProvider crashed on Mobile Safari 26.5.2).
// The try also swallows setItem's QuotaExceededError (Safari private mode)
// and the SSR ReferenceError for `window`, so callers never need their own
// environment checks. Persistence is best-effort by design: on failure the
// app silently runs with defaults instead of crashing.

export function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage blocked or full — run without persistence.
  }
}
