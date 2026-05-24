/**
 * Block-level Zod schemas for the InsightBlob.
 *
 * Extracted from insight-blob.schema.ts to keep both files under 200 lines.
 * Forward-compatible: block-level shapes use `.passthrough()` so new fields
 * don't require schema bumps as long as existing fields remain compatible.
 */
import { z } from 'zod'

// Common shorthands to reduce repetition.
const uint = z.number().int().min(0)
const pct = z.number().min(0).max(100)
const isoOrEmpty = z.string()

export const dateRangeSchema = z.object({ first: isoOrEmpty, last: isoOrEmpty }).passthrough()

export const metaSchema = z.object({
  schemaVersion: z.literal(1),
  catalogVersion: z.number().int().min(1).max(99),
  totalPhotos: uint, dateRange: dateRangeSchema,
  parsedAt: z.number().int(),
  catalogHash: z.string().regex(/^[0-9a-f]{64}$/, 'expected 64-char lowercase hex'),
}).passthrough()

export const overviewSchema = z.object({
  totalPhotos: uint, dateRange: dateRangeSchema, daysShot: uint,
  photosPerDay: z.number().min(0), bodyCount: uint, lensCount: uint,
  topBody: z.string().nullable(), topLens: z.string().nullable(),
  topFocalLengthMm: z.number().nullable(),
}).passthrough()

export const gearSchema = z.object({
  bodiesOverTime: z.array(z.object({ month: z.string(), body: z.string(), count: uint }).passthrough()),
  topLenses: z.array(z.object({ lens: z.string(), count: uint }).passthrough()),
  topCombos: z.array(z.object({
    body: z.string(), lens: z.string(), count: uint, firstUsed: z.string(), lastUsed: z.string(),
  }).passthrough()),
  retired: z.array(z.object({ kind: z.enum(['body', 'lens']), name: z.string(), lastUsed: z.string() }).passthrough()),
}).passthrough()

export const focalLengthSchema = z.object({
  histogram: z.array(z.object({ mm: z.number(), count: uint }).passthrough()),
  topPeaks: z.array(z.object({ mm: z.number(), pctOfTotal: pct }).passthrough()),
  bestOnePrime: z.object({ mm: z.number(), coveragePct: pct }).passthrough().nullable(),
}).passthrough()

export const focalLengthPerZoomSchema = z.object({
  zooms: z.array(z.object({
    lens: z.string(),
    histogram: z.array(z.object({ mm: z.number(), count: uint }).passthrough()),
    topMm: z.number(), topMmPct: pct,
  }).passthrough()),
}).passthrough()

export const apertureSchema = z.object({
  perLens: z.array(z.object({
    lens: z.string(),
    histogram: z.array(z.object({ aperture: z.number(), count: uint }).passthrough()),
    wideOpenPct: pct,
  }).passthrough()),
}).passthrough()

export const timeOfDaySchema = z.object({
  byClockHour: z.array(z.object({ hour: z.number().int().min(0).max(23), count: uint }).passthrough()),
  bySunAngle: z.object({
    gpsPhotosCount: uint, goldenHour: uint, blueHour: uint, midday: uint, night: uint,
  }).passthrough(),
  perGearByClockHour: z.array(z.object({
    gear: z.string(),
    histogram: z.array(z.object({ hour: z.number().int(), count: uint }).passthrough()),
  }).passthrough()),
}).passthrough()

export const heatmapSchema = z.object({
  byDay: z.array(z.object({ date: z.string(), count: uint, topLens: z.string().nullable() }).passthrough()),
  years: z.array(z.number().int()),
}).passthrough()

export const gpsSchema = z.object({
  totalPhotosWithGps: uint, pctWithGps: pct,
  clusters: z.array(z.object({ lat: z.number(), lng: z.number(), count: uint }).passthrough()),
  topRegions: z.array(z.object({ region: z.string(), count: uint }).passthrough()),
}).passthrough()

// Shared sub-schema for pick-rate-by-gear tables (used by curation + ratings).
const pickRateByBodyRow = z.object({ body: z.string(), total: uint, rated4Plus: uint, pickRatePct: pct }).passthrough()
const pickRateByLensRow = z.object({ lens: z.string(), total: uint, rated4Plus: uint, pickRatePct: pct }).passthrough()

export const curationSchema = z.object({
  funnel: z.object({ total: uint, notRejected: uint, rated1Plus: uint, rated4Plus: uint }).passthrough(),
  pickRateByBody: z.array(pickRateByBodyRow),
  pickRateByLens: z.array(pickRateByLensRow),
}).passthrough()

export const editIntensitySchema = z.object({
  avgExposureShiftStops: z.number(), avgCropPct: pct,
  pctWithLocalAdjustments: pct, pctWithPresets: pct,
  topPresets: z.array(z.object({ name: z.string(), count: uint }).passthrough()),
  scoreByMonth: z.array(z.object({ month: z.string(), score: pct }).passthrough()),
  perGearScores: z.array(z.object({ gear: z.string(), score: pct }).passthrough()),
  sampled: z.boolean(), sampleSize: uint,
}).passthrough()

export const ratingsSchema = z.object({
  distribution: z.object({
    rejected: uint, r0: uint, r1: uint, r2: uint, r3: uint, r4: uint, r5: uint,
  }).passthrough(),
  colorLabels: z.array(z.object({ label: z.string(), count: uint }).passthrough()),
  pickRateByBody: z.array(pickRateByBodyRow),
  pickRateByLens: z.array(pickRateByLensRow),
}).passthrough()

export const keywordsSchema = z.object({
  totalTaggedPhotos: uint, totalUntaggedPhotos: uint,
  uniqueKeywordCount: uint, avgKeywordsPerTaggedPhoto: z.number().min(0),
  orphanKeywordCount: uint,
  topKeywords: z.array(z.object({ keyword: z.string(), count: uint }).passthrough()),
  blindSpots: z.array(z.object({ yearMonth: z.string(), coveragePct: pct }).passthrough()),
}).passthrough()

export const burstsSchema = z.object({
  totalBursts: uint, totalPhotosInBursts: uint,
  pctInBursts: pct, longestBurst: uint,
  lengthHistogram: z.array(z.object({ length: uint, count: uint }).passthrough()),
  keeperRatePct: pct, singleShotKeeperRatePct: pct,
}).passthrough()

export const catalogHealthSchema = z.object({
  missingOriginals: uint, missingPreviews: uint, brokenPaths: uint, likelyDuplicates: uint,
  duplicateClusters: z.array(z.object({
    size: uint, firstPath: z.string(), lastPath: z.string(), captureTime: z.string(),
  }).passthrough()),
  missingByRootFolder: z.array(z.object({ folder: z.string(), count: uint }).passthrough()),
}).passthrough()
