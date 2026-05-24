// Shared types for the Lightroom Catalog Analyzer.
// Schema-version bump when InsightBlob shape changes in a non-backward-compatible way.
export type InsightSchemaVersion = 1

export interface CatalogMeta {
  schemaVersion: InsightSchemaVersion
  catalogVersion: number          // Lightroom Classic DB version (9..14)
  totalPhotos: number
  dateRange: { first: string; last: string }   // ISO date strings
  parsedAt: number                // epoch ms
  catalogHash: string             // sha256 of size + lastModified + first 64 KB
}

export interface OverviewBlock {
  totalPhotos: number
  dateRange: { first: string; last: string }
  daysShot: number
  photosPerDay: number
  bodyCount: number
  lensCount: number
  topBody: string | null
  topLens: string | null
  topFocalLengthMm: number | null
}

export interface GearBlock {
  bodiesOverTime: Array<{ month: string; body: string; count: number }>
  topLenses: Array<{ lens: string; count: number }>
  topCombos: Array<{ body: string; lens: string; count: number; firstUsed: string; lastUsed: string }>
  retired: Array<{ kind: 'body' | 'lens'; name: string; lastUsed: string }>
}

export interface FocalLengthBlock {
  histogram: Array<{ mm: number; count: number }>   // 1mm bins, 35mm-equivalent
  topPeaks: Array<{ mm: number; pctOfTotal: number }>
  bestOnePrime: { mm: number; coveragePct: number } | null  // null when coverage < 30%
}

export interface FocalLengthPerZoomBlock {
  zooms: Array<{
    lens: string
    histogram: Array<{ mm: number; count: number }>
    topMm: number
    topMmPct: number
  }>
}

export interface ApertureBlock {
  perLens: Array<{
    lens: string
    histogram: Array<{ aperture: number; count: number }>
    wideOpenPct: number              // % of shots at the widest f-number observed
  }>
}

export interface TimeOfDayBlock {
  byClockHour: Array<{ hour: number; count: number }>
  bySunAngle: {
    gpsPhotosCount: number           // photos with usable GPS — basis of sun-angle calc
    goldenHour: number
    blueHour: number
    midday: number
    night: number
  }
  perGearByClockHour: Array<{ gear: string; histogram: Array<{ hour: number; count: number }> }>
}

export interface HeatmapBlock {
  byDay: Array<{ date: string; count: number; topLens: string | null }>   // ISO date keys
  years: number[]                     // years present in the catalog
}

export interface CurationBlock {
  funnel: {
    total: number
    notRejected: number
    rated1Plus: number
    rated4Plus: number
  }
  pickRateByBody: Array<{ body: string; total: number; rated4Plus: number; pickRatePct: number }>
  pickRateByLens: Array<{ lens: string; total: number; rated4Plus: number; pickRatePct: number }>
}

export interface EditIntensityBlock {
  avgExposureShiftStops: number
  avgCropPct: number
  pctWithLocalAdjustments: number
  pctWithPresets: number
  topPresets: Array<{ name: string; count: number }>
  scoreByMonth: Array<{ month: string; score: number }>
  perGearScores: Array<{ gear: string; score: number }>
  sampled: boolean                    // true when 5% sampling kicked in
  sampleSize: number                  // n of photos analyzed
}

export interface RatingsBlock {
  distribution: { rejected: number; r0: number; r1: number; r2: number; r3: number; r4: number; r5: number }
  colorLabels: Array<{ label: string; count: number }>
  pickRateByBody: Array<{ body: string; total: number; rated4Plus: number; pickRatePct: number }>
  pickRateByLens: Array<{ lens: string; total: number; rated4Plus: number; pickRatePct: number }>
}

export interface KeywordsBlock {
  totalTaggedPhotos: number
  totalUntaggedPhotos: number
  uniqueKeywordCount: number
  avgKeywordsPerTaggedPhoto: number
  orphanKeywordCount: number
  topKeywords: Array<{ keyword: string; count: number }>   // only keywords on ≥3 photos
  blindSpots: Array<{ yearMonth: string; coveragePct: number }>
}

export interface GPSBlock {
  totalPhotosWithGps: number
  pctWithGps: number
  clusters: Array<{ lat: number; lng: number; count: number }>   // ~5 km grid, ≥5 photos
  topRegions: Array<{ region: string; count: number }>
}

export interface BurstsBlock {
  totalBursts: number
  totalPhotosInBursts: number
  pctInBursts: number
  longestBurst: number
  lengthHistogram: Array<{ length: number; count: number }>
  keeperRatePct: number              // ≥4 stars among burst photos
  singleShotKeeperRatePct: number    // ≥4 stars among non-burst photos
}

export interface YearInReviewBlock {
  year: number
  totalPhotos: number
  daysShot: number
  topBody: string | null
  topLens: string | null
  topFocalLengthMm: number | null
  topApertureFNumber: number | null
  mostProlificMonth: { month: string; count: number } | null
  avgShotsPerDay: number
  monthlyVolume: Array<{ month: string; count: number }>
  topGearShare: Array<{ gear: string; pct: number }>
  timeOfDayShare: Array<{ bucket: 'morning' | 'midday' | 'evening' | 'night'; pct: number }>
  topLensInMonth: string | null
}

export interface YearToYearBlock {
  years: number[]                     // most recent N years that have data
  rows: Array<{
    statKey: string                   // 'totalPhotos' | 'daysShot' | ...
    label: string
    values: Array<number | string>    // one per year
    deltas: Array<number | null>      // delta vs previous year (null for first year)
  }>
  biggestShift: { statKey: string; year: number; deltaText: string } | null
}

export interface CatalogHealthBlock {
  missingOriginals: number
  missingPreviews: number
  brokenPaths: number
  likelyDuplicates: number
  duplicateClusters: Array<{ size: number; firstPath: string; lastPath: string; captureTime: string }>
  missingByRootFolder: Array<{ folder: string; count: number }>
}
export interface AnalysisFilter {
  dateRange?: { start: string; end: string }
  cameras?: string[]
  lenses?: string[]
  focalLengthRange?: [number, number]
  apertureRange?: [number, number]
  isoRange?: [number, number]
  ratings?: number[]
  keywords?: string[]
  picks?: 'pick' | 'reject' | 'none'
}
export interface InsightBlob {
  meta: CatalogMeta
  yearInReview: YearInReviewBlock | null
  yearToYear: YearToYearBlock | null
  overview: OverviewBlock
  gear: GearBlock
  focalLength: FocalLengthBlock
  focalLengthPerZoom: FocalLengthPerZoomBlock
  apertures: ApertureBlock
  timeOfDay: TimeOfDayBlock
  heatmap: HeatmapBlock
  gps: GPSBlock
  curation: CurationBlock
  editIntensity: EditIntensityBlock
  ratings: RatingsBlock
  keywords: KeywordsBlock
  bursts: BurstsBlock
  catalogHealth: CatalogHealthBlock
  filterContext?: AnalysisFilter
}

export interface ProgressEvent {
  stage: string
  pct: number   // 0..100
}
