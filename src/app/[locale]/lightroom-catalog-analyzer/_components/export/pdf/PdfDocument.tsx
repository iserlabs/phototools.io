import { Document } from '@react-pdf/renderer'
import type { InsightBlob } from '@/lib/lrcat/types'
import { CoverPage } from './CoverPage'
import { FilterContextPage } from './FilterContextPage'
import type { SectionStrings } from './pages/types'
import { YearInReviewPage } from './pages/YearInReviewPage'
import { YearToYearPage } from './pages/YearToYearPage'
import { OverviewPage } from './pages/OverviewPage'
import { GearPage } from './pages/GearPage'
import { FocalLengthPage } from './pages/FocalLengthPage'
import { FocalLengthPerZoomPage } from './pages/FocalLengthPerZoomPage'
import { AperturesPage } from './pages/AperturesPage'
import { TimeOfDayPage } from './pages/TimeOfDayPage'
import { HeatmapPage } from './pages/HeatmapPage'
import { GpsPage } from './pages/GpsPage'
import { CurationPage } from './pages/CurationPage'
import { EditIntensityPage } from './pages/EditIntensityPage'
import { RatingsPage } from './pages/RatingsPage'
import { KeywordsPage } from './pages/KeywordsPage'
import { BurstsPage } from './pages/BurstsPage'
import { PeriodComparisonPage } from './pages/PeriodComparisonPage'
import { CatalogHealthPage } from './pages/CatalogHealthPage'

/** Flat string bag — resolved by the caller (ExportBar) via useTranslations,
 *  because react-pdf renders outside React context and cannot call hooks. */
export interface PdfStrings {
  title: string
  filteredSuffix: string
  localFooter: string
  generatedBy: string
  totalPhotos: string
  dateRange: string
  catalogVersion: string
  filterTitle: string
  page: string
  sections: SectionStrings
}

/** PNG data URLs for the embeddable charts, keyed by chart id. */
export interface PdfCharts {
  yearInReview?: string
  gearBodies?: string
  gearLenses?: string
  focalLength?: string
  focalLengthPerZoom?: string
  apertures?: string
  timeOfDay?: string
  heatmap?: string
  gps?: string
  curation?: string
  editIntensity?: string
  ratings?: string
  keywords?: string
  bursts?: string
}

export function PdfDocument({ blob, strings, charts }: { blob: InsightBlob; strings: PdfStrings; charts: PdfCharts }) {
  const s = strings.sections
  const filtered = !!blob.filterContext
  return (
    <Document title={`${strings.title}${filtered ? strings.filteredSuffix : ''}`} author="phototools.io" creator="phototools.io">
      <CoverPage blob={blob} strings={strings} filtered={filtered} />
      {blob.filterContext && <FilterContextPage filter={blob.filterContext} strings={strings} />}
      <YearInReviewPage blob={blob} s={s} g={strings} chart={charts.yearInReview} />
      <YearToYearPage blob={blob} s={s} g={strings} />
      <OverviewPage blob={blob} s={s} g={strings} />
      <GearPage blob={blob} s={s} g={strings} bodiesChart={charts.gearBodies} lensesChart={charts.gearLenses} />
      <FocalLengthPage blob={blob} s={s} g={strings} chart={charts.focalLength} />
      <FocalLengthPerZoomPage blob={blob} s={s} g={strings} chart={charts.focalLengthPerZoom} />
      <AperturesPage blob={blob} s={s} g={strings} chart={charts.apertures} />
      <TimeOfDayPage blob={blob} s={s} g={strings} chart={charts.timeOfDay} />
      <HeatmapPage blob={blob} s={s} g={strings} chart={charts.heatmap} />
      <GpsPage blob={blob} s={s} g={strings} chart={charts.gps} />
      <CurationPage blob={blob} s={s} g={strings} chart={charts.curation} />
      <EditIntensityPage blob={blob} s={s} g={strings} chart={charts.editIntensity} />
      <RatingsPage blob={blob} s={s} g={strings} chart={charts.ratings} />
      <KeywordsPage blob={blob} s={s} g={strings} chart={charts.keywords} />
      <BurstsPage blob={blob} s={s} g={strings} chart={charts.bursts} />
      <PeriodComparisonPage s={s} g={strings} />
      <CatalogHealthPage blob={blob} s={s} g={strings} />
    </Document>
  )
}
