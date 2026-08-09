import { describe, it, expect } from 'vitest'
import { formatMm, buildDistanceText, buildDistanceCsv, buildMacroText, buildMacroCsv, buildStackJson } from './stackingExport'

const SHOTS = [
  { number: 1, focusDistance: 0.52, nearFocus: 0.5, farFocus: 0.55 },
  { number: 2, focusDistance: 0.57, nearFocus: 0.54, farFocus: 0.61 },
]

describe('formatMm', () => {
  it('renders sub-mm as µm', () => { expect(formatMm(0.768)).toBe('768 µm') })
  it('renders mm with 2 decimals', () => { expect(formatMm(1.204)).toBe('1.20 mm') })
})

describe('buildDistanceText', () => {
  it('includes header and numbered cm/m distances', () => {
    const txt = buildDistanceText(100, 8, 'Full Frame', SHOTS)
    expect(txt).toContain('100mm f/8 Full Frame')
    expect(txt).toContain('1. 52 cm')
  })
})

describe('buildDistanceCsv', () => {
  it('emits header + one row per shot with step column', () => {
    const lines = buildDistanceCsv(SHOTS).split('\n')
    expect(lines[0]).toBe('shot,focus_m,near_m,far_m,step_m')
    expect(lines.length).toBe(3)
    expect(lines[2]).toContain('0.050') // step = 0.57 - 0.52
  })
  it('writes Infinity for a hyperfocal final shot', () => {
    const csv = buildDistanceCsv([{ number: 1, focusDistance: 30, nearFocus: 15, farFocus: Infinity }])
    expect(csv).toContain('Infinity')
  })
})

describe('buildMacroText', () => {
  const ROWS = [
    { number: 1, railPositionMm: 0, sliceStartMm: 0, sliceEndMm: 0.2 },
    { number: 2, railPositionMm: 0.15, sliceStartMm: 0.15, sliceEndMm: 0.35 },
  ]

  it('includes a header identifying magnification, aperture, effective aperture, and sensor', () => {
    const txt = buildMacroText(2, 8, 24, 'Full Frame', ROWS)
    expect(txt).toContain('2.00×')
    expect(txt).toContain('f/8')
    expect(txt).toContain('f/24.0')
    expect(txt).toContain('Full Frame')
  })

  it('emits one numbered line per row with the rail position in mm', () => {
    const txt = buildMacroText(2, 8, 24, 'Full Frame', ROWS)
    const lines = txt.split('\n')
    expect(lines.length).toBe(1 + ROWS.length)
    expect(lines[1]).toBe('1. 0 µm')
    expect(lines[2]).toBe('2. 150 µm')
  })
})

describe('buildMacroCsv', () => {
  it('emits rail positions in mm', () => {
    const csv = buildMacroCsv([{ number: 1, railPositionMm: 0, sliceStartMm: 0, sliceEndMm: 0.96 }])
    expect(csv.split('\n')[0]).toBe('shot,rail_position_mm,slice_start_mm,slice_end_mm')
    expect(csv).toContain('0.960')
  })
})

describe('buildStackJson', () => {
  it('serializes Infinity as the string "Infinity"', () => {
    const json = buildStackJson({ tool: 'focus-stacking-calculator' }, [{ farFocus: Infinity }])
    expect(JSON.parse(json).shots[0].farFocus).toBe('Infinity')
  })
})
