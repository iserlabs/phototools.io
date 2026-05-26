import type { CatalogHealthBlock } from '@/lib/lrcat/types'

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

const DUPLICATE_CLUSTER_LIMIT = 20

/**
 * Catalog Health is whole-catalog only — spec §5.5 / §2.2 list it as
 * "ignores global filter". No `AnalysisFilter` argument here on purpose.
 */
export function aggregateCatalogHealth(db: DbLike): CatalogHealthBlock {
  // The `missing` column doesn't exist in all LrC catalog versions.
  // Wrap missing-file queries in try/catch so catalogs without the column
  // still get duplicate detection (which doesn't depend on `missing`).
  let missingOriginals = 0
  let missingByRootFolder: Array<{ folder: string; count: number }> = []
  try {
    const missingTotals = db.selectObject(
      `SELECT COUNT(*) AS n FROM AgLibraryFile WHERE missing = 1`,
    ) as { n: number } | undefined
    missingOriginals = missingTotals?.n ?? 0

    const rawMissingPaths = db.selectObjects(
      `SELECT pathFromRoot FROM AgLibraryFile WHERE missing = 1 AND pathFromRoot IS NOT NULL`,
    ) as Array<{ pathFromRoot: string }>
    const folderCounts = new Map<string, number>()
    for (const row of rawMissingPaths) {
      const parts = row.pathFromRoot.split('/')
      const folder = parts.length >= 2 ? parts.slice(0, 2).join('/') : parts[0]
      folderCounts.set(folder, (folderCounts.get(folder) ?? 0) + 1)
    }
    missingByRootFolder = [...folderCounts.entries()]
      .map(([folder, count]) => ({ folder, count }))
      .sort((a, b) => b.count - a.count)
  } catch {
    // `missing` column absent — leave both at their zero/empty defaults.
  }

  // Duplicate detection: GROUP BY the EXIF signature; only clusters of size ≥ 2.
  // The path columns (AgLibraryFile.pathFromRoot, img.rootFile) may not exist in
  // all LrC versions — wrap so the rest of catalog-health still returns data.
  let likelyDuplicates = 0
  let duplicateClusters: Array<{ size: number; firstPath: string; lastPath: string; captureTime: string }> = []
  try {
    const clusterRows = db.selectObjects(
      `SELECT img.captureTime AS captureTime,
              cam.value AS cameraModel,
              exif.focalLength AS focalLength,
              exif.isoSpeedRating AS iso,
              exif.aperture AS aperture,
              exif.shutterSpeed AS shutter,
              COUNT(*) AS size,
              MIN(file.pathFromRoot) AS firstPath,
              MAX(file.pathFromRoot) AS lastPath
         FROM Adobe_images img
         JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
         JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
         JOIN AgLibraryFile file ON file.id_local = img.rootFile
        WHERE img.captureTime IS NOT NULL
          AND exif.focalLength IS NOT NULL AND exif.isoSpeedRating IS NOT NULL
          AND exif.aperture IS NOT NULL AND exif.shutterSpeed IS NOT NULL
        GROUP BY img.captureTime, cam.value, exif.focalLength, exif.isoSpeedRating, exif.aperture, exif.shutterSpeed
        HAVING COUNT(*) >= 2
        ORDER BY size DESC
        LIMIT ${DUPLICATE_CLUSTER_LIMIT}`,
    ) as Array<{ size: number; firstPath: string; lastPath: string; captureTime: string }>
    duplicateClusters = clusterRows.map((r) => ({
      size: r.size, firstPath: r.firstPath, lastPath: r.lastPath, captureTime: r.captureTime,
    }))
    likelyDuplicates = (db.selectObject(
      `SELECT COALESCE(SUM(size), 0) AS total FROM (
          SELECT COUNT(*) AS size
            FROM Adobe_images img
            JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
            JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
           WHERE img.captureTime IS NOT NULL
             AND exif.focalLength IS NOT NULL AND exif.isoSpeedRating IS NOT NULL
             AND exif.aperture IS NOT NULL AND exif.shutterSpeed IS NOT NULL
           GROUP BY img.captureTime, cam.value, exif.focalLength, exif.isoSpeedRating, exif.aperture, exif.shutterSpeed
          HAVING COUNT(*) >= 2
        ) AS clusters`,
    ) as { total: number } | undefined)?.total ?? 0
  } catch {
    // pathFromRoot / rootFile column absent in some LrC versions — skip duplicates.
  }

  return {
    missingOriginals,
    missingPreviews: 0,   // preview state is in .lrdata, not the catalog SQLite — see task header note
    brokenPaths: missingOriginals,
    likelyDuplicates,
    duplicateClusters,
    missingByRootFolder,
  }
}
