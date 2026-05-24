/**
 * Canonical section structure for the Lightroom Catalog Analyzer dashboard.
 * Consumed by Dashboard.tsx (renders the anchor IDs), SectionAnchorNav.tsx
 * (renders the sidebar list), and MobileSectionDropdown.tsx.
 *
 * Section IDs match `toolUI.lightroom-catalog-analyzer.sectionNav.section.<id>` keys.
 */

export type SectionId =
  | 'year-in-review'
  | 'year-to-year'
  | 'overview'
  | 'gear'
  | 'focal-length'
  | 'focal-length-per-zoom'
  | 'apertures'
  | 'time-of-day'
  | 'heatmap'
  | 'gps'
  | 'curation'
  | 'edit-intensity'
  | 'ratings'
  | 'keywords'
  | 'bursts'
  | 'period-comparison'
  | 'catalog-health'

export type SectionGroup =
  | 'highlights'
  | 'whatYouShoot'
  | 'howYouCurate'
  | 'exploreCompare'
  | 'catalog'

export interface SectionGroupSpec {
  group: SectionGroup
  sections: SectionId[]
}

export const SECTION_GROUPS: readonly SectionGroupSpec[] = [
  { group: 'highlights',     sections: ['year-in-review', 'year-to-year'] },
  { group: 'whatYouShoot',   sections: ['overview', 'gear', 'focal-length', 'focal-length-per-zoom', 'apertures', 'time-of-day', 'heatmap', 'gps'] },
  { group: 'howYouCurate',   sections: ['curation', 'edit-intensity', 'ratings', 'keywords', 'bursts'] },
  { group: 'exploreCompare', sections: ['period-comparison'] },
  { group: 'catalog',        sections: ['catalog-health'] },
] as const

export const ALL_SECTION_IDS: readonly SectionId[] = SECTION_GROUPS.flatMap((g) => g.sections)

export function anchorIdFor(section: SectionId): string {
  return `section-${section}`
}
