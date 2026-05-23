'use client'

import { useTranslations } from 'next-intl'
import { ALL_SECTION_IDS, anchorIdFor, type SectionId } from '../nav/sections'
import styles from './LightroomCatalogAnalyzer.module.css'

// Per-section skeleton minimum height in px. Approximates the eventual chart
// height so anchor scroll-into-view lands on the right region even before
// Plan 1f mounts the real chart. Tunable — these values match the spec's
// expected layout grids.
const SECTION_MIN_HEIGHTS: Record<SectionId, number> = {
  'year-in-review': 540,
  'year-to-year': 460,
  'overview': 220,
  'gear': 480,
  'focal-length': 360,
  'focal-length-per-zoom': 420,
  'apertures': 420,
  'time-of-day': 360,
  'heatmap': 320,
  'gps': 480,
  'curation': 360,
  'edit-intensity': 380,
  'ratings': 360,
  'keywords': 320,
  'bursts': 320,
  'drilldown': 480,
  'period-comparison': 460,
  'catalog-health': 360,
}

export function Dashboard() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  const navT = useTranslations('toolUI.lightroom-catalog-analyzer.sectionNav.section')

  return (
    <div className={styles.dashboard}>
      {ALL_SECTION_IDS.map((id) => (
        <section
          key={id}
          id={anchorIdFor(id)}
          className={styles.dashboardSection}
          style={{ minHeight: `${SECTION_MIN_HEIGHTS[id]}px` }}
          aria-busy="true"
        >
          <h2 className={styles.dashboardSectionHeading}>{navT(id)}</h2>
          {/* TODO Plan 1f: replace this skeleton with the real section body. */}
          <div className={styles.dashboardSkeleton} role="presentation">
            <span className={styles.skeletonLabel}>
              {t('dashboard.sectionLoadingLabel', { section: navT(id) })}
            </span>
          </div>
        </section>
      ))}

      <footer className={styles.dashboardFooter}>
        {t('dashboard.footerNote')}
      </footer>
    </div>
  )
}
