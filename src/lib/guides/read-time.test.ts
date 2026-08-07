import { describe, expect, it } from 'vitest'
import { getReadTimeMinutes } from './read-time'

describe('getReadTimeMinutes', () => {
  it('counts Latin words and rounds up', () => {
    const body = Array(250).fill('word').join(' ')
    expect(getReadTimeMinutes(body, 'en')).toBe(2)
  })
  it('never returns less than 1 minute', () => {
    expect(getReadTimeMinutes('short text', 'en')).toBe(1)
  })
  it('segments CJK text without whitespace', () => {
    const body = '写真の露出を理解することは重要です。'.repeat(100)
    expect(getReadTimeMinutes(body, 'ja')).toBeGreaterThan(1)
  })
  it('segments Thai text without whitespace', () => {
    const body = 'การถ่ายภาพมาโครต้องใช้ความอดทน'.repeat(120)
    expect(getReadTimeMinutes(body, 'th')).toBeGreaterThan(1)
  })
  it('ignores punctuation-only segments', () => {
    expect(getReadTimeMinutes('... --- !!!', 'en')).toBe(1)
  })
})
