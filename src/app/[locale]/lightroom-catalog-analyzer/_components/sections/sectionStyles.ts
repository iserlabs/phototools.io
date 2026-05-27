import type { CSSProperties } from 'react'

/** Panel/tile background. */
export const SURFACE = 'var(--bg-surface)'

/** Soft accent-tinted callout background. */
export const CALLOUT_BG = 'color-mix(in srgb, var(--accent) 8%, var(--bg-surface))'

/** Muted variant of the accent for de-emphasised chart elements. */
export const ACCENT_MUTED = 'color-mix(in srgb, var(--accent) 35%, transparent)'

/** Grid of headline stat tiles. */
export const TILE_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 10,
  margin: '12px 0',
}

export const TILE: CSSProperties = {
  background: SURFACE,
  padding: '14px 16px',
  borderRadius: 10,
  border: '1px solid var(--border)',
}

export const TILE_LABEL: CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-muted)',
}

export const TILE_VALUE: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: '4px 0 0',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.01em',
}

export const CALLOUT: CSSProperties = {
  background: CALLOUT_BG,
  padding: '12px 16px',
  borderRadius: 10,
  borderLeft: '3px solid var(--accent)',
  margin: 0,
  fontSize: 13,
  lineHeight: 1.55,
  color: 'var(--text-secondary)',
}

export const SECTION_HEADER: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 16,
}

export const TABLE: CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  border: '1px solid var(--border)',
  borderRadius: 10,
  overflow: 'hidden',
  fontSize: 13,
}

/** Compact unstyled list. */
export const COMPACT_LIST: CSSProperties = { margin: 0, paddingLeft: 16 }

/** Inline figure. */
export const INLINE_FIGURE: CSSProperties = { margin: '16px 0' }

/** Label-like caption text. */
export const MUTED_LABEL: CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
  fontWeight: 600,
  letterSpacing: '0.02em',
}

/** Small disclaimer text. */
export const DISCLAIMER: CSSProperties = { fontSize: 13, color: 'var(--text-muted)' }

/**
 * Dark-mode styling for every recharts `<Tooltip>`.
 */
export const TOOLTIP_PROPS = {
  contentStyle: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    padding: '8px 12px',
    backdropFilter: 'blur(8px)',
  } as CSSProperties,
  itemStyle: { color: 'var(--text-primary)', fontSize: 13, padding: 0 } as CSSProperties,
  labelStyle: { color: 'var(--text-secondary)', fontSize: 11, marginBottom: 4, fontWeight: 600, letterSpacing: '0.02em' } as CSSProperties,
  cursor: {
    fill: 'color-mix(in srgb, var(--accent) 8%, transparent)',
    stroke: 'var(--border)',
  },
} as const
