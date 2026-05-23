import { z } from 'zod'

// Forward-compatible policy:
// - meta.schemaVersion is strict (must equal 1).
// - block-level shapes use `.passthrough()` so new fields added by aggregators
//   in later plans don't require schema bumps as long as existing fields
//   remain compatible.
// - The top-level InsightBlob object also passes through unknown keys so a
//   newer worker can add new top-level blocks without breaking older shares.

const isoOrEmpty = z.string()
const catalogHash64 = z.string().regex(/^[0-9a-f]{64}$/, 'expected 64-char lowercase hex')

const dateRangeSchema = z.object({
  first: isoOrEmpty,
  last: isoOrEmpty,
}).passthrough()

const metaSchema = z.object({
  schemaVersion: z.literal(1),
  catalogVersion: z.number().int().min(1).max(99),
  totalPhotos: z.number().int().min(0),
  dateRange: dateRangeSchema,
  parsedAt: z.number().int(),
  catalogHash: catalogHash64,
}).passthrough()

const overviewSchema = z.object({
  totalPhotos: z.number().int().min(0),
  dateRange: dateRangeSchema,
  daysShot: z.number().int().min(0),
  photosPerDay: z.number().min(0),
  bodyCount: z.number().int().min(0),
  lensCount: z.number().int().min(0),
  topBody: z.string().nullable(),
  topLens: z.string().nullable(),
  topFocalLengthMm: z.number().nullable(),
}).passthrough()

const gearSchema = z.object({
  bodiesOverTime: z.array(z.object({
    month: z.string(), body: z.string(), count: z.number().int().min(0),
  }).passthrough()),
  topLenses: z.array(z.object({
    lens: z.string(), count: z.number().int().min(0),
  }).passthrough()),
  topCombos: z.array(z.object({
    body: z.string(), lens: z.string(), count: z.number().int().min(0),
    firstUsed: z.string(), lastUsed: z.string(),
  }).passthrough()),
  retired: z.array(z.object({
    kind: z.enum(['body', 'lens']),
    name: z.string(),
    lastUsed: z.string(),
  }).passthrough()),
}).passthrough()

const focalLengthSchema = z.object({
  histogram: z.array(z.object({ mm: z.number(), count: z.number().int().min(0) }).passthrough()),
  topPeaks: z.array(z.object({ mm: z.number(), pctOfTotal: z.number().min(0).max(100) }).passthrough()),
  bestOnePrime: z.object({
    mm: z.number(),
    coveragePct: z.number().min(0).max(100),
  }).passthrough().nullable(),
}).passthrough()

const focalLengthPerZoomSchema = z.object({
  zooms: z.array(z.object({
    lens: z.string(),
    histogram: z.array(z.object({ mm: z.number(), count: z.number().int().min(0) }).passthrough()),
    topMm: z.number(),
    topMmPct: z.number().min(0).max(100),
  }).passthrough()),
}).passthrough()

const apertureSchema = z.object({
  perLens: z.array(z.object({
    lens: z.string(),
    histogram: z.array(z.object({ aperture: z.number(), count: z.number().int().min(0) }).passthrough()),
    wideOpenPct: z.number().min(0).max(100),
  }).passthrough()),
}).passthrough()

const timeOfDaySchema = z.object({
  byClockHour: z.array(z.object({ hour: z.number().int().min(0).max(23), count: z.number().int().min(0) }).passthrough()),
  bySunAngle: z.object({
    gpsPhotosCount: z.number().int().min(0),
    goldenHour: z.number().int().min(0),
    blueHour: z.number().int().min(0),
    midday: z.number().int().min(0),
    night: z.number().int().min(0),
  }).passthrough(),
  perGearByClockHour: z.array(z.object({
    gear: z.string(),
    histogram: z.array(z.object({ hour: z.number().int(), count: z.number().int().min(0) }).passthrough()),
  }).passthrough()),
}).passthrough()

const heatmapSchema = z.object({
  byDay: z.array(z.object({
    date: z.string(),
    count: z.number().int().min(0),
    topLens: z.string().nullable(),
  }).passthrough()),
  years: z.array(z.number().int()),
}).passthrough()

const gpsSchema = z.object({
  totalPhotosWithGps: z.number().int().min(0),
  pctWithGps: z.number().min(0).max(100),
  clusters: z.array(z.object({
    lat: z.number(), lng: z.number(), count: z.number().int().min(0),
  }).passthrough()),
  topRegions: z.array(z.object({
    region: z.string(), count: z.number().int().min(0),
  }).passthrough()),
}).passthrough()

const curationSchema = z.object({
  funnel: z.object({
    total: z.number().int().min(0),
    notRejected: z.number().int().min(0),
    rated1Plus: z.number().int().min(0),
    rated4Plus: z.number().int().min(0),
  }).passthrough(),
  pickRateByBody: z.array(z.object({
    body: z.string(),
    total: z.number().int().min(0),
    rated4Plus: z.number().int().min(0),
    pickRatePct: z.number().min(0).max(100),
  }).passthrough()),
  pickRateByLens: z.array(z.object({
    lens: z.string(),
    total: z.number().int().min(0),
    rated4Plus: z.number().int().min(0),
    pickRatePct: z.number().min(0).max(100),
  }).passthrough()),
}).passthrough()

const editIntensitySchema = z.object({
  avgExposureShiftStops: z.number(),
  avgCropPct: z.number().min(0).max(100),
  pctWithLocalAdjustments: z.number().min(0).max(100),
  pctWithPresets: z.number().min(0).max(100),
  topPresets: z.array(z.object({ name: z.string(), count: z.number().int().min(0) }).passthrough()),
  scoreByMonth: z.array(z.object({ month: z.string(), score: z.number().min(0).max(100) }).passthrough()),
  perGearScores: z.array(z.object({ gear: z.string(), score: z.number().min(0).max(100) }).passthrough()),
  sampled: z.boolean(),
  sampleSize: z.number().int().min(0),
}).passthrough()

const ratingsSchema = z.object({
  distribution: z.object({
    rejected: z.number().int().min(0),
    r0: z.number().int().min(0),
    r1: z.number().int().min(0),
    r2: z.number().int().min(0),
    r3: z.number().int().min(0),
    r4: z.number().int().min(0),
    r5: z.number().int().min(0),
  }).passthrough(),
  colorLabels: z.array(z.object({ label: z.string(), count: z.number().int().min(0) }).passthrough()),
  pickRateByBody: z.array(z.object({
    body: z.string(),
    total: z.number().int().min(0),
    rated4Plus: z.number().int().min(0),
    pickRatePct: z.number().min(0).max(100),
  }).passthrough()),
  pickRateByLens: z.array(z.object({
    lens: z.string(),
    total: z.number().int().min(0),
    rated4Plus: z.number().int().min(0),
    pickRatePct: z.number().min(0).max(100),
  }).passthrough()),
}).passthrough()

const keywordsSchema = z.object({
  totalTaggedPhotos: z.number().int().min(0),
  totalUntaggedPhotos: z.number().int().min(0),
  uniqueKeywordCount: z.number().int().min(0),
  avgKeywordsPerTaggedPhoto: z.number().min(0),
  orphanKeywordCount: z.number().int().min(0),
  topKeywords: z.array(z.object({ keyword: z.string(), count: z.number().int().min(0) }).passthrough()),
  blindSpots: z.array(z.object({
    yearMonth: z.string(), coveragePct: z.number().min(0).max(100),
  }).passthrough()),
}).passthrough()

const burstsSchema = z.object({
  totalBursts: z.number().int().min(0),
  totalPhotosInBursts: z.number().int().min(0),
  pctInBursts: z.number().min(0).max(100),
  longestBurst: z.number().int().min(0),
  lengthHistogram: z.array(z.object({
    length: z.number().int().min(0), count: z.number().int().min(0),
  }).passthrough()),
  keeperRatePct: z.number().min(0).max(100),
  singleShotKeeperRatePct: z.number().min(0).max(100),
}).passthrough()

const catalogHealthSchema = z.object({
  missingOriginals: z.number().int().min(0),
  missingPreviews: z.number().int().min(0),
  brokenPaths: z.number().int().min(0),
  likelyDuplicates: z.number().int().min(0),
  duplicateClusters: z.array(z.object({
    size: z.number().int().min(0),
    firstPath: z.string(),
    lastPath: z.string(),
    captureTime: z.string(),
  }).passthrough()),
  missingByRootFolder: z.array(z.object({
    folder: z.string(), count: z.number().int().min(0),
  }).passthrough()),
}).passthrough()

const yearInReviewSchema = z.object({
  year: z.number().int(),
  totalPhotos: z.number().int().min(0),
  daysShot: z.number().int().min(0),
  topBody: z.string().nullable(),
  topLens: z.string().nullable(),
  topFocalLengthMm: z.number().nullable(),
  topApertureFNumber: z.number().nullable(),
  mostProlificMonth: z.object({ month: z.string(), count: z.number().int().min(0) }).passthrough().nullable(),
  avgShotsPerDay: z.number().min(0),
  monthlyVolume: z.array(z.object({ month: z.string(), count: z.number().int().min(0) }).passthrough()),
  topGearShare: z.array(z.object({ gear: z.string(), pct: z.number().min(0).max(100) }).passthrough()),
  timeOfDayShare: z.array(z.object({
    bucket: z.enum(['morning', 'midday', 'evening', 'night']),
    pct: z.number().min(0).max(100),
  }).passthrough()),
  topLensInMonth: z.string().nullable(),
}).passthrough()

const yearToYearSchema = z.object({
  years: z.array(z.number().int()),
  rows: z.array(z.object({
    statKey: z.string(),
    label: z.string(),
    values: z.array(z.union([z.number(), z.string()])),
    deltas: z.array(z.number().nullable()),
  }).passthrough()),
  biggestShift: z.object({
    statKey: z.string(),
    year: z.number().int(),
    deltaText: z.string(),
  }).passthrough().nullable(),
}).passthrough()

const analysisFilterSchema = z.object({
  dateRange: z.object({ start: z.string(), end: z.string() }).passthrough().optional(),
  cameras: z.array(z.string()).optional(),
  lenses: z.array(z.string()).optional(),
  focalLengthRange: z.tuple([z.number(), z.number()]).optional(),
  apertureRange: z.tuple([z.number(), z.number()]).optional(),
  isoRange: z.tuple([z.number(), z.number()]).optional(),
  ratings: z.array(z.number().int()).optional(),
  keywords: z.array(z.string()).optional(),
  picks: z.enum(['pick', 'reject', 'none']).optional(),
}).passthrough()

export const insightBlobSchema = z.object({
  meta: metaSchema,
  yearInReview: yearInReviewSchema.nullable(),
  yearToYear: yearToYearSchema.nullable(),
  overview: overviewSchema,
  gear: gearSchema,
  focalLength: focalLengthSchema,
  focalLengthPerZoom: focalLengthPerZoomSchema,
  apertures: apertureSchema,
  timeOfDay: timeOfDaySchema,
  heatmap: heatmapSchema,
  gps: gpsSchema,
  curation: curationSchema,
  editIntensity: editIntensitySchema,
  ratings: ratingsSchema,
  keywords: keywordsSchema,
  bursts: burstsSchema,
  catalogHealth: catalogHealthSchema,
  filterContext: analysisFilterSchema.optional(),
}).passthrough()

export type ValidatedInsightBlob = z.infer<typeof insightBlobSchema>
