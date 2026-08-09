import type { StackingShot } from '@/lib/math/stacking'
import type { MacroShotRow } from '@/lib/math/macroStack'

/** "768 µm" below 1mm, "1.20 mm" at or above. */
export function formatMm(mm: number): string {
  return mm < 1 ? `${Math.round(mm * 1000)} µm` : `${mm.toFixed(2)} mm`
}

const m3 = (v: number) => (v === Infinity ? 'Infinity' : v.toFixed(3))
const cmOrM = (d: number) => (d < 1 ? `${(d * 100).toFixed(0)} cm` : `${d.toFixed(2)} m`)

export function buildDistanceText(
  focalLength: number, aperture: number, sensorName: string, shots: StackingShot[],
): string {
  const header = `Focus Stacking Sequence (${focalLength}mm f/${aperture} ${sensorName})`
  const lines = shots.map((s, i) => {
    const step = i === 0 ? '' : `  (+${cmOrM(s.focusDistance - shots[i - 1].focusDistance)})`
    return `${s.number}. ${cmOrM(s.focusDistance)}${step}`
  })
  return [header, ...lines].join('\n')
}

export function buildDistanceCsv(shots: StackingShot[]): string {
  const rows = shots.map((s, i) => [
    s.number, m3(s.focusDistance), m3(s.nearFocus), m3(s.farFocus),
    i === 0 ? '' : m3(s.focusDistance - shots[i - 1].focusDistance),
  ].join(','))
  return ['shot,focus_m,near_m,far_m,step_m', ...rows].join('\n')
}

export function buildMacroCsv(rows: MacroShotRow[]): string {
  const lines = rows.map((r) =>
    [r.number, r.railPositionMm.toFixed(3), r.sliceStartMm.toFixed(3), r.sliceEndMm.toFixed(3)].join(','))
  return ['shot,rail_position_mm,slice_start_mm,slice_end_mm', ...lines].join('\n')
}

export function buildStackJson(meta: Record<string, unknown>, rows: unknown[]): string {
  return JSON.stringify({ ...meta, shots: rows }, (_k, v) => (v === Infinity ? 'Infinity' : v), 2)
}

/** Client-side download via Blob + anchor. No network involved. */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
