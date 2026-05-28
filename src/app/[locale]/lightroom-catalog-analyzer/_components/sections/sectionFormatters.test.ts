import { describe, expect, it } from 'vitest'
import { fmtDate, apexToFNumber, snapFNumber, snapAperture, fmtAperture, fmtFStop } from './sectionFormatters'

describe('fmtDate', () => {
  it('formats an ISO timestamp to US short date', () => {
    expect(fmtDate('2025-08-05T16:20:03.93')).toBe('Aug 5, 2025')
  })

  it('handles date-only input', () => {
    expect(fmtDate('2026-01-15')).toBe('Jan 15, 2026')
  })

  it('returns em-dash for empty string', () => {
    expect(fmtDate('')).toBe('—')
  })

  it('returns the raw slice for unparseable dates', () => {
    expect(fmtDate('not-a-date-at-all')).toBe('not-a-date')
  })

  it('handles short strings gracefully', () => {
    expect(fmtDate('hi')).toBe('hi')
  })
})

describe('apexToFNumber', () => {
  it('converts APEX 0 to f/1', () => {
    expect(apexToFNumber(0)).toBeCloseTo(1, 2)
  })

  it('converts APEX 2 to f/2', () => {
    expect(apexToFNumber(2)).toBeCloseTo(2, 2)
  })

  it('converts APEX 6 to f/8', () => {
    expect(apexToFNumber(6)).toBeCloseTo(8, 2)
  })

  it('converts APEX 4.97 to ~f/5.6', () => {
    expect(apexToFNumber(4.97)).toBeCloseTo(5.58, 1)
  })
})

describe('snapFNumber', () => {
  it('snaps exact f-stop values', () => {
    expect(snapFNumber(8)).toBe(8)
    expect(snapFNumber(2.8)).toBe(2.8)
    expect(snapFNumber(5.6)).toBe(5.6)
  })

  it('snaps near values to closest standard f-stop', () => {
    expect(snapFNumber(4.5)).toBe(4.5)
    expect(snapFNumber(7.2)).toBe(7.1)
    expect(snapFNumber(6.2)).toBe(6.3)
  })
})

describe('snapAperture (APEX → snapped f-number)', () => {
  it('converts APEX 6.0 to f/8', () => {
    expect(snapAperture(6.0)).toBe(8)
  })

  it('converts APEX 4.0 to f/4', () => {
    expect(snapAperture(4.0)).toBe(4)
  })

  it('converts APEX ~4.34 to f/4.5', () => {
    expect(snapAperture(4.33985)).toBe(4.5)
  })

  it('converts APEX ~4.97 to f/5.6', () => {
    expect(snapAperture(4.970854)).toBe(5.6)
  })
})

describe('fmtAperture', () => {
  it('formats APEX 6 as f/8', () => {
    expect(fmtAperture(6)).toBe('f/8')
  })

  it('formats APEX ~4.97 as f/5.6', () => {
    expect(fmtAperture(4.970854)).toBe('f/5.6')
  })
})

describe('fmtFStop', () => {
  it('formats integer f-stops without decimal', () => {
    expect(fmtFStop(8)).toBe('f/8')
    expect(fmtFStop(16)).toBe('f/16')
  })

  it('formats non-integer f-stops with one decimal', () => {
    expect(fmtFStop(2.8)).toBe('f/2.8')
    expect(fmtFStop(5.6)).toBe('f/5.6')
    expect(fmtFStop(6.3)).toBe('f/6.3')
  })
})
