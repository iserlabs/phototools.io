/**
 * Typed empty defaults for every InsightBlob section.
 * Used by `runAggregators` when a single aggregator throws so the
 * dashboard can render the remaining successful sections.
 */
import type {
  OverviewBlock,
  GearBlock,
  FocalLengthBlock,
  FocalLengthPerZoomBlock,
  ApertureBlock,
  TimeOfDayBlock,
  HeatmapBlock,
  GPSBlock,
  CurationBlock,
  EditIntensityBlock,
  RatingsBlock,
  KeywordsBlock,
  BurstsBlock,
  CatalogHealthBlock,
  YearInReviewBlock,
  YearToYearBlock,
} from '@/lib/lrcat/types'

export const EMPTY_OVERVIEW: OverviewBlock = {
  totalPhotos: 0,
  dateRange: { first: '', last: '' },
  daysShot: 0,
  photosPerDay: 0,
  bodyCount: 0,
  lensCount: 0,
  topBody: null,
  topLens: null,
  topFocalLengthMm: null,
}

export const EMPTY_GEAR: GearBlock = {
  bodiesOverTime: [],
  topLenses: [],
  topCombos: [],
  retired: [],
}

export const EMPTY_FOCAL_LENGTH: FocalLengthBlock = {
  histogram: [],
  topPeaks: [],
  bestOnePrime: null,
}

export const EMPTY_FOCAL_LENGTH_PER_ZOOM: FocalLengthPerZoomBlock = {
  zooms: [],
}

export const EMPTY_APERTURE: ApertureBlock = {
  perLens: [],
}

export const EMPTY_TIME_OF_DAY: TimeOfDayBlock = {
  byClockHour: [],
  bySunAngle: { gpsPhotosCount: 0, goldenHour: 0, blueHour: 0, midday: 0, night: 0 },
  perGearByClockHour: [],
}

export const EMPTY_HEATMAP: HeatmapBlock = {
  byDay: [],
  years: [],
}

export const EMPTY_GPS: GPSBlock = {
  totalPhotosWithGps: 0,
  pctWithGps: 0,
  clusters: [],
  topRegions: [],
}

export const EMPTY_CURATION: CurationBlock = {
  funnel: { total: 0, notRejected: 0, rated1Plus: 0, rated4Plus: 0 },
  pickRateByBody: [],
  pickRateByLens: [],
}

export const EMPTY_EDIT_INTENSITY: EditIntensityBlock = {
  avgExposureShiftStops: 0,
  avgCropPct: 0,
  pctWithLocalAdjustments: 0,
  pctWithPresets: 0,
  topPresets: [],
  scoreByMonth: [],
  perGearScores: [],
  sampled: false,
  sampleSize: 0,
}

export const EMPTY_RATINGS: RatingsBlock = {
  distribution: { rejected: 0, r0: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 },
  colorLabels: [],
  pickRateByBody: [],
  pickRateByLens: [],
}

export const EMPTY_KEYWORDS: KeywordsBlock = {
  totalTaggedPhotos: 0,
  totalUntaggedPhotos: 0,
  uniqueKeywordCount: 0,
  avgKeywordsPerTaggedPhoto: 0,
  orphanKeywordCount: 0,
  topKeywords: [],
  blindSpots: [],
}

export const EMPTY_BURSTS: BurstsBlock = {
  totalBursts: 0,
  totalPhotosInBursts: 0,
  pctInBursts: 0,
  longestBurst: 0,
  lengthHistogram: [],
  keeperRatePct: 0,
  singleShotKeeperRatePct: 0,
}

export const EMPTY_CATALOG_HEALTH: CatalogHealthBlock = {
  missingOriginals: 0,
  missingPreviews: 0,
  brokenPaths: 0,
  likelyDuplicates: 0,
  duplicateClusters: [],
  missingByRootFolder: [],
}

export const EMPTY_YEAR_IN_REVIEW: YearInReviewBlock | null = null

export const EMPTY_YEAR_TO_YEAR: YearToYearBlock | null = null
