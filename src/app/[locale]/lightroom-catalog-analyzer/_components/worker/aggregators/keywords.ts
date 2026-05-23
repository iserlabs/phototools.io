import type { KeywordsBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

const MIN_PHOTOS_PER_KEYWORD = 3              // PII guard, spec §4.13
const BLIND_SPOT_COVERAGE_THRESHOLD = 0.2     // months below this fraction tagged

export function aggregateKeywords(db: DbLike, filter?: AnalysisFilter): KeywordsBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  // Top keywords with the PII threshold baked in via HAVING.
  // m-8 (audit): the keyword/image joins use raw id_local columns purely SQL-side
  // (ki.tag = kw.id_local, img.id_local = ki.image) — no identifier is pulled into
  // JS for arithmetic, so there is no 2^53 overflow risk.
  const topKeywords = db.selectObjects(
    `SELECT kw.name AS keyword, COUNT(DISTINCT ki.image) AS n
       FROM AgLibraryKeyword kw
       JOIN AgLibraryKeywordImage ki ON ki.tag = kw.id_local
       JOIN Adobe_images img ON img.id_local = ki.image
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE kw.name IS NOT NULL ${where}
      GROUP BY kw.name
      HAVING COUNT(DISTINCT ki.image) >= ${MIN_PHOTOS_PER_KEYWORD}
      ORDER BY n DESC
      LIMIT 20`,
    pred.params,
  ) as Array<{ keyword: string; n: number }>

  // Total photos in filtered universe.
  const totalPhotos = (db.selectObject(
    `SELECT COUNT(*) AS n
       FROM Adobe_images img
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE 1=1 ${where}`,
    pred.params,
  ) as { n: number } | undefined)?.n ?? 0

  // Distinct tagged photos.
  const taggedPhotos = (db.selectObject(
    `SELECT COUNT(DISTINCT img.id_local) AS n
       FROM Adobe_images img
       JOIN AgLibraryKeywordImage ki ON ki.image = img.id_local
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE 1=1 ${where}`,
    pred.params,
  ) as { n: number } | undefined)?.n ?? 0

  // Total tag-rows (used for avg keywords per tagged photo — counts duplicates as the
  // catalog stores them; this matches what photographers see in LrC's tag counts).
  const totalTagRows = (db.selectObject(
    `SELECT COUNT(*) AS n
       FROM AgLibraryKeywordImage ki
       JOIN Adobe_images img ON img.id_local = ki.image
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE 1=1 ${where}`,
    pred.params,
  ) as { n: number } | undefined)?.n ?? 0

  // Unique + orphan keyword counts (whole-catalog: keywords are global, not filtered).
  const uniqueKeywordCount = (db.selectObject(
    `SELECT COUNT(*) AS n FROM AgLibraryKeyword`,
  ) as { n: number } | undefined)?.n ?? 0

  const orphanKeywordCount = (db.selectObject(
    `SELECT COUNT(*) AS n
       FROM AgLibraryKeyword kw
       WHERE NOT EXISTS (SELECT 1 FROM AgLibraryKeywordImage ki WHERE ki.tag = kw.id_local)`,
  ) as { n: number } | undefined)?.n ?? 0

  // Blind spots: per-month tagged-fraction below threshold.
  const monthly = db.selectObjects(
    `SELECT substr(img.captureTime, 1, 7) AS month,
            COUNT(*) AS total,
            COUNT(DISTINCT CASE WHEN ki.image IS NOT NULL THEN img.id_local END) AS tagged
       FROM Adobe_images img
       LEFT JOIN AgLibraryKeywordImage ki ON ki.image = img.id_local
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE img.captureTime IS NOT NULL ${where}
      GROUP BY month
      ORDER BY month ASC`,
    pred.params,
  ) as Array<{ month: string; total: number; tagged: number }>

  const blindSpots = monthly
    .filter((m) => m.total > 0 && m.tagged / m.total < BLIND_SPOT_COVERAGE_THRESHOLD)
    .map((m) => ({
      yearMonth: m.month,
      coveragePct: Math.round((m.tagged / m.total) * 1000) / 10,
    }))

  return {
    totalTaggedPhotos: taggedPhotos,
    totalUntaggedPhotos: Math.max(0, totalPhotos - taggedPhotos),
    uniqueKeywordCount,
    avgKeywordsPerTaggedPhoto: taggedPhotos > 0
      ? Math.round((totalTagRows / taggedPhotos) * 100) / 100
      : 0,
    orphanKeywordCount,
    topKeywords: topKeywords.map((r) => ({ keyword: r.keyword, count: r.n })),
    blindSpots,
  }
}
