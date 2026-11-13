/**
 * Transition Type tagged on every in-app page navigation (the i18n `Link`
 * default and the language switcher). The root layout's `<ViewTransition>`
 * animates ONLY transitions carrying this type.
 *
 * Why it must be opt-in: every tool mirrors its state into the URL with
 * `history.replaceState` (`src/lib/utils/replaceUrl.ts`), and Next.js turns
 * each such call into a router restore inside `startTransition`. An untyped
 * `<ViewTransition>` around the page content made every one of those — one
 * per slider move or filter change — a full document view transition. While
 * one runs, React's event system is disabled until the browser invokes the
 * update callback, and the `::view-transition` overlay swallows clicks while
 * it animates, so input landing in that window was silently dropped (the
 * slider moved, the state didn't). Navigations still animate as before.
 */
export const PAGE_NAV_TRANSITION = 'page-nav'
