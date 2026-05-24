import type { CSSProperties } from 'react'

/**
 * Shared inline-style tokens for the dashboard section components.
 *
 * The sections deliberately do not own a CSS Module (to stay under the
 * 200-line per-file cap). These constants map the section visual language onto
 * the real design tokens defined in `src/app/globals.css` — there is no
 * `--surface` / `--callout-bg` / `--accent-muted` token, so we derive them from
 * the canonical `--bg-surface` / `--accent` / `--text-muted` tokens here rather
 * than inventing new global variables.
 */

/** Panel/tile background. */
export const SURFACE = 'var(--bg-surface)'

/** Soft accent-tinted callout background. */
export const CALLOUT_BG = 'color-mix(in srgb, var(--accent) 12%, var(--bg-surface))'

/** Muted variant of the accent for de-emphasised chart elements. */
export const ACCENT_MUTED = 'color-mix(in srgb, var(--accent) 35%, transparent)'

/** Grid of headline stat tiles (used by Overview, YearInReview, Keywords, etc.). */
export const TILE_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 12,
  margin: '12px 0',
}

export const TILE: CSSProperties = {
  background: SURFACE,
  padding: 14,
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
}

export const TILE_LABEL: CSSProperties = { fontSize: 12, color: 'var(--text-muted)' }

export const TILE_VALUE: CSSProperties = { fontSize: 20, fontWeight: 600, margin: 0 }

export const CALLOUT: CSSProperties = {
  background: CALLOUT_BG,
  padding: 12,
  borderRadius: 8,
  margin: 0,
}

export const SECTION_HEADER: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 16,
}

export const TABLE: CSSProperties = { width: '100%', borderCollapse: 'collapse' }

/** Compact unstyled list (presets, peaks, per-gear scores, etc.). */
export const COMPACT_LIST: CSSProperties = { margin: 0, paddingLeft: 16 }

/** Inline figure (used inside map/repeating per-lens chart sections). */
export const INLINE_FIGURE: CSSProperties = { margin: '16px 0' }

/** Label-like caption text shown above sparklines / below charts. */
export const MUTED_LABEL: CSSProperties = { fontSize: 12, color: 'var(--text-muted)' }

/** Small disclaimer text (e.g. duplicates caveat in CatalogHealth). */
export const DISCLAIMER: CSSProperties = { fontSize: 13, color: 'var(--text-muted)' }

/**
 * Dark-mode styling for every recharts `<Tooltip>`. recharts renders a white
 * card by default — unreadable on the dark surface — so spread these props onto
 * each tooltip: `<Tooltip {...TOOLTIP_PROPS} />`. A custom wrapper component
 * won't work (recharts detects Tooltip by component type), hence shared props.
 * The `cursor` carries both `fill` (bar charts) and `stroke` (line/area charts);
 * each chart family reads the key it needs and ignores the other.
 */
export const TOOLTIP_PROPS = {
  contentStyle: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxShadow: 'var(--shadow-md)',
    padding: '8px 10px',
  } as CSSProperties,
  itemStyle: { color: 'var(--text-primary)', fontSize: 13, padding: 0 } as CSSProperties,
  labelStyle: { color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 } as CSSProperties,
  cursor: {
    fill: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
    stroke: 'var(--border)',
  },
} as const
