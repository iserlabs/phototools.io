import type { CSSProperties } from 'react'

export function fmtDate(iso: string): string {
  if (!iso || iso.length < 10) return iso || '—'
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  if (isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STANDARD_FSTOPS = [
  1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8,
  3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9,
  10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32,
]

/** Lightroom stores APEX aperture values, not f-numbers. Convert first. */
export function apexToFNumber(apex: number): number {
  return Math.pow(2, apex / 2)
}

export function snapFNumber(fNum: number): number {
  let best = STANDARD_FSTOPS[0]!
  let bestDist = Infinity
  for (const f of STANDARD_FSTOPS) {
    const d = Math.abs(Math.log2(fNum) - Math.log2(f))
    if (d < bestDist) { bestDist = d; best = f }
  }
  return best
}

/** Convert an APEX aperture value to a display-ready snapped f-stop. */
export function snapAperture(apex: number): number {
  return snapFNumber(apexToFNumber(apex))
}

export function fmtAperture(apex: number): string {
  const snapped = snapAperture(apex)
  return fmtFStop(snapped)
}

/** Format an already-converted f-number (not APEX) for display. */
export function fmtFStop(fNum: number): string {
  return `f/${fNum % 1 === 0 ? fNum.toFixed(0) : fNum}`
}

export const PILL: CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 12,
  background: 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
  border: '1px solid color-mix(in srgb, var(--text-primary) 8%, transparent)',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '1.4',
  whiteSpace: 'nowrap' as const,
  letterSpacing: '0.01em',
}
