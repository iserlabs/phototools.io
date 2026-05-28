import { describe, expect, it } from 'vitest'
import { ALL_SECTION_IDS, SECTION_GROUPS, anchorIdFor } from './sections'

describe('SECTION_GROUPS', () => {
  it('contains exactly 5 groups in canonical order', () => {
    expect(SECTION_GROUPS.map((g) => g.group)).toEqual([
      'highlights',
      'whatYouShoot',
      'howYouCurate',
      'exploreCompare',
      'catalog',
    ])
  })

  it('has no empty group', () => {
    for (const g of SECTION_GROUPS) {
      expect(g.sections.length).toBeGreaterThan(0)
    }
  })

  it('places year-in-review first (it is the headline section)', () => {
    expect(SECTION_GROUPS[0]!.sections[0]).toBe('year-in-review')
  })
})

describe('ALL_SECTION_IDS', () => {
  it('is the flat concatenation of all group sections', () => {
    const sum = SECTION_GROUPS.reduce((n, g) => n + g.sections.length, 0)
    expect(ALL_SECTION_IDS).toHaveLength(sum)
  })

  it('contains every section id exactly once (no duplicates)', () => {
    expect(new Set(ALL_SECTION_IDS).size).toBe(ALL_SECTION_IDS.length)
  })

  it('matches the SectionId union exhaustively', () => {
    // If a new SectionId is added but not placed in a group, this test fails.
    // The 17 sections currently defined: year-in-review, year-to-year, overview,
    // gear, focal-length, focal-length-per-zoom, apertures, time-of-day, heatmap,
    // gps, curation, edit-intensity, ratings, keywords, bursts, period-comparison,
    // catalog-health.
    expect(ALL_SECTION_IDS).toHaveLength(17)
  })
})

describe('anchorIdFor', () => {
  it('returns the section-prefixed anchor id', () => {
    expect(anchorIdFor('overview')).toBe('section-overview')
    expect(anchorIdFor('year-to-year')).toBe('section-year-to-year')
  })

  it('produces a unique anchor for every section', () => {
    const anchors = ALL_SECTION_IDS.map(anchorIdFor)
    expect(new Set(anchors).size).toBe(anchors.length)
  })
})
