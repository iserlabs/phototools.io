import { useCallback, useSyncExternalStore } from 'react'

const hasMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

/**
 * Subscribes to a CSS media query via `matchMedia(...).addEventListener('change')`
 * instead of a window `resize` listener, so components re-render only when
 * the query result actually flips — not on every resize frame.
 *
 * `serverValue` is used for SSR/hydration (and where matchMedia is missing,
 * e.g. jsdom); React re-renders with the real value right after hydration.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    if (!hasMatchMedia()) return () => {}
    const mql = window.matchMedia(query)
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [query])

  return useSyncExternalStore(
    subscribe,
    () => (hasMatchMedia() ? window.matchMedia(query).matches : serverValue),
    () => serverValue,
  )
}
