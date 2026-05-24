import { z } from 'zod'
import {
  metaSchema,
  overviewSchema,
  gearSchema,
  focalLengthSchema,
  focalLengthPerZoomSchema,
  apertureSchema,
  timeOfDaySchema,
  heatmapSchema,
  gpsSchema,
  curationSchema,
  editIntensitySchema,
  ratingsSchema,
  keywordsSchema,
  burstsSchema,
  catalogHealthSchema,
} from './insight-blob-blocks.schema'

// Forward-compatible policy:
// - meta.schemaVersion is strict (must equal 1).
// - block-level shapes use `.passthrough()` so new fields added by aggregators
//   in later plans don't require schema bumps as long as existing fields
//   remain compatible.
// - The top-level InsightBlob object also passes through unknown keys so a
//   newer worker can add new top-level blocks without breaking older shares.

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
