// Canvas draw functions can't use `useTranslations`/CSS-in-JS — they read the
// current theme's colors straight off computed CSS custom properties. Reading
// `getComputedStyle` on every animation frame is wasteful, so the result is
// cached at module scope; `invalidateCanvasPalette()` is called by a
// `MutationObserver` in `SensorSize.tsx` whenever `ThemeProvider` flips the
// `data-theme` attribute on `<html>`.
export type CanvasPalette = { tooltipBg: string; tooltipFg: string }

// Generic dark-theme-ish fallbacks, used only if the custom properties
// resolve to an empty string (e.g. `globals.css` hasn't loaded yet).
const FALLBACK_TOOLTIP_BG = '#16181d'
const FALLBACK_TOOLTIP_FG = '#e8eaed'

let cached: CanvasPalette | null = null

export function getCanvasPalette(el: HTMLElement): CanvasPalette {
  if (cached) return cached
  const styles = getComputedStyle(el)
  const tooltipBg = styles.getPropertyValue('--bg-surface').trim() || FALLBACK_TOOLTIP_BG
  const tooltipFg = styles.getPropertyValue('--text-primary').trim() || FALLBACK_TOOLTIP_FG
  cached = { tooltipBg, tooltipFg }
  return cached
}

export function invalidateCanvasPalette(): void {
  cached = null
}
