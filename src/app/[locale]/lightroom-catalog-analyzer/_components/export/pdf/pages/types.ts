import type { InsightBlob } from '@/lib/lrcat/types'
import type { PdfStrings } from '../PdfDocument'

/** Per-section strings the PDF pages render. Each key is a section. */
export interface SectionStrings {
  yearInReview: { title: string; tiles: Record<string, string>; callout: string }
  yearToYear: { title: string; stat: string; biggestShift: string }
  overview: { title: string; tiles: Record<string, string> }
  gear: { title: string; bodiesOverTime: string; topLenses: string; retired: string; lensHeader: string; photosHeader: string }
  focalLength: { title: string; histogramTitle: string; topPeaks: string; onePrime: string; noPrime: string }
  focalLengthPerZoom: { title: string; perLens: string }
  apertures: { title: string; perLens: string }
  timeOfDay: { title: string; gpsNote: string }
  heatmap: { title: string; daysWithPhotos: string; yearsCovered: string }
  gps: { title: string; coverage: string; topRegions: string; regionHeader: string; photosHeader: string }
  curation: { title: string; stageHeader: string; photosHeader: string }
  editIntensity: { title: string; tiles: Record<string, string>; sampledNote: string }
  ratings: { title: string; ratingHeader: string; photosHeader: string }
  keywords: { title: string; tiles: Record<string, string>; keywordHeader: string; photosHeader: string }
  bursts: { title: string; tiles: Record<string, string>; keeperRate: string }
  periodComparison: { title: string; notExported: string }
  catalogHealth: { title: string; tiles: Record<string, string>; actionNote: string }
}

export type SectionPageProps = { blob: InsightBlob; s: SectionStrings; g: PdfStrings; chart?: string }
