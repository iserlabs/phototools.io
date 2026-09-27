import { describe, it, expect } from 'vitest'
import { HARMONY_KEYS } from './colorAnalyzer'

describe('HARMONY_KEYS', () => {
  it('contains 5 harmony types', () => {
    expect(HARMONY_KEYS).toHaveLength(5)
  })

  it('all have non-empty value and key', () => {
    for (const h of HARMONY_KEYS) {
      expect(h.value).toBeTruthy()
      expect(h.key).toBeTruthy()
    }
  })

  it('values are unique', () => {
    const values = HARMONY_KEYS.map(h => h.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('includes all expected harmony types', () => {
    const values = HARMONY_KEYS.map(h => h.value)
    expect(values).toContain('complementary')
    expect(values).toContain('analogous')
    expect(values).toContain('triadic')
    expect(values).toContain('split-complementary')
    expect(values).toContain('tetradic')
  })
})
