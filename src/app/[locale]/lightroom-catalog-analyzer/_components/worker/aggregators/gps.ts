import type { GPSBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'
import { topRegionsFromClusters } from '@/lib/lrcat/regions/lookup'

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

// Privacy guard: snap coordinates to a ~5 km grid before clustering. 0.05° is
// ~5.5 km of latitude (and ≤5.5 km of longitude, shrinking toward the poles),
// so a kept cluster never pinpoints finer than a multi-km cell — matching the
// "~5 km grid" promise in the spec, JSON-LD, and share disclosure. (A previous
// 3-decimal rounding was only ~110 m, far finer than documented.)
const GRID_STEP_DEG = 0.05
const MIN_PHOTOS_PER_CLUSTER = 5
const TOP_CLUSTERS_LIMIT = 200

function snapToGrid(value: number): number {
  // Snap to the nearest GRID_STEP_DEG; toFixed(2) cleans float drift and -0.
  return Number((Math.round(value / GRID_STEP_DEG) * GRID_STEP_DEG).toFixed(2))
}

/**
 * GPS locations aggregator. PII-guarded by construction:
 *   1. Coordinates are snapped to a ~5 km grid (GRID_STEP_DEG).
 *   2. Clusters with fewer than MIN_PHOTOS_PER_CLUSTER photos are dropped.
 *   3. The output is capped to TOP_CLUSTERS_LIMIT clusters by count.
 *
 * topRegions is derived from the PII-guarded clusters via the offline
 * nearest-centroid lookup table in `src/lib/lrcat/regions/` (audit fix M-3).
 * Because it operates on the already-thresholded clusters, no per-photo
 * coordinate ever leaves the cluster granularity.
 */
export function aggregateGps(db: DbLike, filter?: AnalysisFilter): GPSBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  const totals = db.selectObject(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN exif.gpsLatitude IS NOT NULL AND exif.gpsLongitude IS NOT NULL THEN 1 ELSE 0 END) AS withGps
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE 1=1 ${where}`,
    pred.params,
  ) as { total: number; withGps: number | null }

  const total = totals.total ?? 0
  const totalPhotosWithGps = totals.withGps ?? 0
  const pctWithGps = total > 0
    ? Number(((totalPhotosWithGps / total) * 100).toFixed(2))
    : 0

  if (totalPhotosWithGps === 0) {
    return { totalPhotosWithGps: 0, pctWithGps: 0, clusters: [], topRegions: [] }
  }

  // Snap coordinates to the ~5 km grid in SQL (round to the nearest GRID_STEP_DEG,
  // then to 2 decimals so float drift doesn't split a cell), GROUP at that grid,
  // and apply the MIN_PHOTOS_PER_CLUSTER threshold at the SAME ~5 km granularity.
  const clusterRows = db.selectObjects(
    `SELECT ROUND(ROUND(exif.gpsLatitude / ${GRID_STEP_DEG}) * ${GRID_STEP_DEG}, 2) AS lat,
            ROUND(ROUND(exif.gpsLongitude / ${GRID_STEP_DEG}) * ${GRID_STEP_DEG}, 2) AS lng,
            COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE exif.gpsLatitude IS NOT NULL AND exif.gpsLongitude IS NOT NULL ${where}
      GROUP BY lat, lng
      HAVING n >= ${MIN_PHOTOS_PER_CLUSTER}
      ORDER BY n DESC
      LIMIT ${TOP_CLUSTERS_LIMIT}`,
    pred.params,
  ) as Array<{ lat: number; lng: number; n: number }>

  const clusters = clusterRows.map((r) => ({
    lat: snapToGrid(r.lat),
    lng: snapToGrid(r.lng),
    count: r.n,
  }))

  // Reverse-geocode the PII-guarded clusters to country/region labels.
  const topRegions = topRegionsFromClusters(clusters)

  return { totalPhotosWithGps, pctWithGps, clusters, topRegions }
}
