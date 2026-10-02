import { useEffect, useState, type RefObject } from 'react'

/**
 * Tracks whether the browser is currently rendering the referenced element
 * (or, with `parent: true`, its parent), so continuous canvas/WebGL loops can
 * pause while it's off-screen.
 *
 * The observed element must have `content-visibility: auto` (plus a
 * `contain-intrinsic-size`) in CSS: where supported, the browser's own
 * `contentvisibilityautostatechange` event drives the state, which fires a
 * little before the element scrolls back into view. Elsewhere it falls back
 * to an IntersectionObserver with a 200px margin.
 */
export function useIsRendered(ref: RefObject<Element | null>, { parent = false } = {}): boolean {
  const [rendered, setRendered] = useState(true)

  useEffect(() => {
    const el = parent ? ref.current?.parentElement : ref.current
    if (!el) return

    if ('contentVisibility' in document.documentElement.style) {
      const onChange = (e: Event) => setRendered(!(e as ContentVisibilityAutoStateChangeEvent).skipped)
      el.addEventListener('contentvisibilityautostatechange', onChange)
      return () => el.removeEventListener('contentvisibilityautostatechange', onChange)
    }

    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => { for (const entry of entries) setRendered(entry.isIntersecting) },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, parent])

  return rendered
}
