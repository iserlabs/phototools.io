import { describe, it, expect, afterAll } from 'vitest'
import { formatGuideDate } from './format-date'

/**
 * Guide frontmatter dates are plain calendar days (`YYYY-MM-DD`). `new Date()`
 * parses those as UTC midnight, so formatting them in any negative-offset zone
 * lands on the previous day. CI runs in UTC, where the bug is invisible, so
 * these pin the zone explicitly.
 */
const originalTz = process.env.TZ
afterAll(() => {
  process.env.TZ = originalTz
})

describe('formatGuideDate', () => {
  it('keeps the calendar day west of UTC', () => {
    process.env.TZ = 'America/New_York'
    expect(formatGuideDate('2026-08-07', 'en')).toBe('Aug 7, 2026')
  })

  it('keeps the calendar day far west of UTC', () => {
    process.env.TZ = 'Pacific/Honolulu'
    expect(formatGuideDate('2026-01-01', 'en')).toBe('Jan 1, 2026')
  })

  it('keeps the calendar day east of UTC', () => {
    process.env.TZ = 'Asia/Tokyo'
    expect(formatGuideDate('2026-12-31', 'en')).toBe('Dec 31, 2026')
  })

  it('localizes the month name', () => {
    process.env.TZ = 'America/New_York'
    expect(formatGuideDate('2026-08-07', 'es')).toMatch(/ago/i)
  })
})
