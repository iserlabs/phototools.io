import { describe, expect, it } from 'vitest'
import { guideFrontmatterSchema, localeFrontmatterSchema, SLUG_PATTERN } from './schema'

const valid = {
  title: 'Focus Stacking: A Complete Guide',
  description: 'How to get front-to-back sharpness with focus stacking.',
  category: 'techniques',
  relatedTools: ['focus-stacking-calculator'],
  publishedAt: '2026-08-15',
  updatedAt: '2026-08-15',
  status: 'draft',
}

describe('guideFrontmatterSchema', () => {
  it('accepts a minimal valid frontmatter', () => {
    expect(guideFrontmatterSchema.parse(valid)).toMatchObject({ category: 'techniques' })
  })
  it('rejects unknown tool slugs in relatedTools', () => {
    expect(() => guideFrontmatterSchema.parse({ ...valid, relatedTools: ['not-a-tool'] })).toThrow()
  })
  it('rejects unknown keys (strict)', () => {
    expect(() => guideFrontmatterSchema.parse({ ...valid, extra: 'nope' })).toThrow()
  })
  it('rejects bad category and bad status', () => {
    expect(() => guideFrontmatterSchema.parse({ ...valid, category: 'news' })).toThrow()
    expect(() => guideFrontmatterSchema.parse({ ...valid, status: 'disabled' })).toThrow()
  })
  it('rejects non-ISO dates', () => {
    expect(() => guideFrontmatterSchema.parse({ ...valid, publishedAt: '15/08/2026' })).toThrow()
  })
  it('requires heroImage src under /images/guides/ and a non-empty alt', () => {
    expect(() =>
      guideFrontmatterSchema.parse({ ...valid, heroImage: { src: '/guides/x/hero.jpg', alt: 'x' } })
    ).toThrow()
    expect(
      guideFrontmatterSchema.parse({ ...valid, heroImage: { src: '/images/guides/x/hero.jpg', alt: 'Macro rig' } })
    ).toBeTruthy()
  })
})

describe('localeFrontmatterSchema', () => {
  it('accepts translatable keys only', () => {
    expect(
      localeFrontmatterSchema.parse({ title: 'T', description: 'D', sourceHash: 'abc123def456' })
    ).toBeTruthy()
    expect(() =>
      localeFrontmatterSchema.parse({ title: 'T', description: 'D', sourceHash: 'a', category: 'gear' })
    ).toThrow()
  })
})

describe('SLUG_PATTERN', () => {
  it('accepts kebab-case, rejects dots (proxy matcher) and uppercase', () => {
    expect(SLUG_PATTERN.test('macro-photography-getting-started')).toBe(true)
    expect(SLUG_PATTERN.test('v1.2-guide')).toBe(false)
    expect(SLUG_PATTERN.test('Macro')).toBe(false)
  })
})
