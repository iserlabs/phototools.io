import { describe, it, expect } from 'vitest'
import { getAlternates } from './metadata'
import { routing } from './routing'

describe('getAlternates', () => {
  it('returns languages map plus x-default when no locale is provided', () => {
    const result = getAlternates('/fov-simulator')
    expect('canonical' in result).toBe(false)
    expect(result.languages).toBeDefined()
    expect(result.languages.en).toBe('/en/fov-simulator')
    expect(result.languages['x-default']).toBe(`/${routing.defaultLocale}/fov-simulator`)
  })

  it('includes a per-locale canonical when locale is provided', () => {
    const result = getAlternates('/fov-simulator', 'es')
    expect(result.canonical).toBe('/es/fov-simulator')
    expect(result.languages.es).toBe('/es/fov-simulator')
  })

  it('emits a hreflang entry for every configured locale plus x-default', () => {
    const result = getAlternates('/dof-simulator', 'en')
    const keys = Object.keys(result.languages)
    for (const locale of routing.locales) {
      expect(keys).toContain(locale)
    }
    expect(keys).toContain('x-default')
    // languages map should be locales count + 1 for x-default
    expect(keys.length).toBe(routing.locales.length + 1)
  })

  it('handles paths without leading slash conventions consistently', () => {
    const result = getAlternates('/learn/glossary', 'ja')
    expect(result.canonical).toBe('/ja/learn/glossary')
    expect(result.languages.ja).toBe('/ja/learn/glossary')
    expect(result.languages['zh-TW']).toBe('/zh-TW/learn/glossary')
  })

  it('preserves the casing of hyphenated locales (zh-TW)', () => {
    const result = getAlternates('/sensor-size-comparison', 'zh-TW')
    expect(result.canonical).toBe('/zh-TW/sensor-size-comparison')
  })
})
