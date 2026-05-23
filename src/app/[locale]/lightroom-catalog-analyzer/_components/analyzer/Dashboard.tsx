'use client'

import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { ALL_SECTION_IDS, anchorIdFor, type SectionId } from '../nav/sections'
import styles from './LightroomCatalogAnalyzer.module.css'
import { YearInReview } from '../sections/YearInReview'
import { YearToYear } from '../sections/YearToYear'
import { Overview } from '../sections/Overview'
import { Gear } from '../sections/Gear'
import { FocalLength } from '../sections/FocalLength'
import { FocalLengthPerZoom } from '../sections/FocalLengthPerZoom'
import { Apertures } from '../sections/Apertures'
import { TimeOfDay } from '../sections/TimeOfDay'
import { Heatmap } from '../sections/Heatmap'
import { GpsMap } from '../sections/GpsMap'
import { CurationFunnel } from '../sections/CurationFunnel'
import { EditIntensity } from '../sections/EditIntensity'
import { Ratings } from '../sections/Ratings'
import { Keywords } from '../sections/Keywords'
import { Bursts } from '../sections/Bursts'
import { DrilldownForm } from '../sections/DrilldownForm'
import { ActiveFilterPills } from '../sections/ActiveFilterPills'
import { PeriodComparison } from '../sections/PeriodComparison'
import { CatalogHealth } from '../sections/CatalogHealth'

// Per-section skeleton minimum height in px. Keeps anchor scroll-into-view
// landing on the right region even while async chart libraries hydrate, and
// keeps the deterministic-scroll test meaningful.
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

// Section ID → rendered body. `drilldown` mounts the form + active filter pills
// (section IDs `gps` → GpsMap, `curation` → CurationFunnel per Plan 1f mapping).
const SECTION_BODIES: Record<SectionId, ReactNode> = {
  'year-in-review': <YearInReview />,
  'year-to-year': <YearToYear />,
  'overview': <Overview />,
  'gear': <Gear />,
  'focal-length': <FocalLength />,
  'focal-length-per-zoom': <FocalLengthPerZoom />,
  'apertures': <Apertures />,
  'time-of-day': <TimeOfDay />,
  'heatmap': <Heatmap />,
  'gps': <GpsMap />,
  'curation': <CurationFunnel />,
  'edit-intensity': <EditIntensity />,
  'ratings': <Ratings />,
  'keywords': <Keywords />,
  'bursts': <Bursts />,
  'drilldown': (
    <>
      <DrilldownForm />
      <ActiveFilterPills />
    </>
  ),
  'period-comparison': <PeriodComparison />,
  'catalog-health': <CatalogHealth />,
}

export function Dashboard() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')

  return (
    <div className={styles.dashboard}>
      {ALL_SECTION_IDS.map((id) => (
        <section
          key={id}
          id={anchorIdFor(id)}
          className={styles.dashboardSection}
          style={{ minHeight: `${SECTION_MIN_HEIGHTS[id]}px` }}
        >
          {SECTION_BODIES[id]}
        </section>
      ))}

      <footer className={styles.dashboardFooter}>
        {t('dashboard.footerNote')}
      </footer>
    </div>
  )
}
