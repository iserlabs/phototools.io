import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getAllGuideSlugs, getGuide, getGuidesForTool, getLiveGuides, getVisibleGuides, hasVisibleGuides } from './content'

const FIXTURES = path.join(__dirname, '__fixtures__')

describe('content module (NODE_ENV=test behaves like prod: drafts hidden)', () => {
  it('lists all slugs from directory names', () => {
    expect(getAllGuideSlugs(FIXTURES).sort()).toEqual(['draft-guide', 'live-guide'])
  })
  it('getLiveGuides returns only live guides with locale titles', () => {
    const en = getLiveGuides('en', FIXTURES)
    expect(en.map((g) => g.slug)).toEqual(['live-guide'])
    expect(en[0].title).toBe('Fixture Live Guide')
    expect(en[0].readTimeMinutes).toBeGreaterThanOrEqual(1)
    const es = getLiveGuides('es', FIXTURES)
    expect(es[0].title).toBe('Guía fija en vivo')
  })
  it('getVisibleGuides hides drafts outside development', () => {
    expect(getVisibleGuides('en', FIXTURES).map((g) => g.slug)).toEqual(['live-guide'])
    expect(hasVisibleGuides(FIXTURES)).toBe(true)
  })
  it('getGuide merges structural (en) + translatable (locale) and computes toc/body', () => {
    const guide = getGuide('live-guide', 'es', FIXTURES)
    expect(guide).not.toBeNull()
    expect(guide?.category).toBe('techniques')
    expect(guide?.title).toBe('Guía fija en vivo')
    expect(guide?.toc.map((e) => e.id)).toEqual(['primera-sección'])
    expect(guide?.body).toContain('Primera sección')
  })
  it('getGuide returns null for drafts (prod behavior) and unknown slugs', () => {
    expect(getGuide('draft-guide', 'en', FIXTURES)).toBeNull()
    expect(getGuide('nope', 'en', FIXTURES)).toBeNull()
  })
  it('getGuide falls back to en body when a locale file is missing', () => {
    const guide = getGuide('live-guide', 'ja', FIXTURES)
    expect(guide?.title).toBe('Fixture Live Guide')
  })
  it('getGuidesForTool matches relatedTools across live guides only', () => {
    expect(getGuidesForTool('focus-stacking-calculator', 'en', FIXTURES)).toEqual([
      { slug: 'live-guide', title: 'Fixture Live Guide' },
    ])
    expect(getGuidesForTool('dof-simulator', 'en', FIXTURES)).toEqual([])
  })
  it('empty/missing content dir yields empty results, not throws', () => {
    const empty = path.join(__dirname, '__fixtures__', 'does-not-exist')
    expect(getAllGuideSlugs(empty)).toEqual([])
    expect(hasVisibleGuides(empty)).toBe(false)
  })
})
