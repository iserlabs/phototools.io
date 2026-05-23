/**
 * Synthetic Lightroom Classic catalog generator for the
 * Lightroom Catalog Analyzer demo.
 *
 * Run via:
 *   npm run demo:build
 *   # or:
 *   npx tsx scripts/build-demo-catalog.ts
 *
 * Output:
 *   public/demo-catalogs/phototools-demo.lrcat (~20-40 MB uncompressed)
 *
 * The generated catalog is committed to the repo. Re-run this script when
 * aggregator queries change shape and the demo needs to follow suit.
 *
 * The catalog is purely synthetic — no real photographer's data ever leaves
 * a developer's machine via this script.
 */
import BetterSqlite3 from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const OUTPUT = resolve(process.cwd(), 'public/demo-catalogs/phototools-demo.lrcat')
const TOTAL_PHOTOS = 3000
const YEARS = [2023, 2024, 2025]
const SEED = 0x70686f74 // 'phot' — deterministic output across machines

const BODIES: Array<{ name: string; serial: string; fixed?: boolean; fixedFocal?: number }> = [
  { name: 'Sony ILCE-7RM5', serial: 'SN-A7R-V-001' },
  { name: 'FUJIFILM X100V', serial: 'SN-X100V-001', fixed: true, fixedFocal: 23 },
]

const ZOOM_LENSES = [
  { name: 'FE 24-70mm F2.8 GM II', min: 24, max: 70, body: 'Sony ILCE-7RM5', maxAperture: 2.8 },
  { name: 'FE 70-200mm F2.8 GM OSS II', min: 70, max: 200, body: 'Sony ILCE-7RM5', maxAperture: 2.8 },
]
const PRIME_LENSES = [
  { name: 'FE 50mm F1.4 GM', focal: 50, body: 'Sony ILCE-7RM5', maxAperture: 1.4 },
  { name: 'FE 35mm F1.4 GM', focal: 35, body: 'Sony ILCE-7RM5', maxAperture: 1.4 },
]
const FUJI_FIXED_LENS = { name: 'FUJINON 23mm F2', focal: 23, body: 'FUJIFILM X100V', maxAperture: 2.0 }

// Aperture set weighted toward wide-open. Lens-specific clamp applied at sample time.
const APERTURE_POOL: number[] = [
  1.4, 1.4, 1.4,
  1.8, 1.8,
  2.0, 2.0,
  2.8, 2.8, 2.8,
  4.0, 4.0,
  5.6,
  8.0,
  11.0,
  16.0,
]

const COMMON_KEYWORDS = ['landscape', 'portrait', 'street', 'travel', 'family']
const RARE_KEYWORDS = Array.from({ length: 30 }, (_, i) => `rare-tag-${i + 1}`)

const GPS_CLUSTERS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'New York City',  lat: 40.7128,  lng: -74.0060 },
  { name: 'Tokyo',          lat: 35.6762,  lng: 139.6503 },
  { name: 'Yosemite',       lat: 37.8651,  lng: -119.5383 },
  { name: 'Iceland',        lat: 64.9631,  lng: -19.0208 },
]

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0
    s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0
    return ((s ^ (s >>> 15)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)) }

function isoDate(year: number, dayOfYear: number, hour: number): string {
  const d = new Date(Date.UTC(year, 0, 1))
  d.setUTCDate(d.getUTCDate() + dayOfYear)
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(hour).padStart(2, '0')
  return `${year}-${m}-${dd}T${hh}:${String((dayOfYear * 7) % 60).padStart(2, '0')}:00`
}

function makeDevelopSettings(rng: () => number): string {
  const exp = ((rng() - 0.5) * 4).toFixed(2)           // -2..+2 stops
  const cropPct = rng() * 0.3                          // 0..30% area cropped
  const top = (cropPct * 0.5).toFixed(3)
  const bottom = (1 - cropPct * 0.5).toFixed(3)
  const hasLocal = rng() > 0.7
  const local = hasLocal
    ? '\n\tGradientBasedCorrections = { { LocalExposure2012 = "0.3" }, },'
    : ''
  return `s = {
\tExposure2012 = "${exp}",
\tContrast2012 = "${Math.round((rng() - 0.5) * 40)}",
\tHighlights2012 = "${Math.round((rng() - 0.5) * 40)}",
\tShadows2012 = "${Math.round((rng() - 0.5) * 40)}",
\tCropTop = "${top}",
\tCropLeft = "0",
\tCropBottom = "${bottom}",
\tCropRight = "1",
\tHasSettings = true,${local}
}`
}

function rating(rng: () => number): number {
  const r = rng()
  if (r < 0.70) return 0
  if (r < 0.85) return 4
  if (r < 0.95) return 5
  if (r < 0.98) return 3
  return 2
}

function pickAperture(rng: () => number, maxOpen: number): number {
  // Sample from APERTURE_POOL until we hit one ≥ maxOpen (lens can't go wider).
  for (let tries = 0; tries < 10; tries++) {
    const candidate = pick(rng, APERTURE_POOL)
    if (candidate >= maxOpen) return candidate
  }
  return maxOpen
}

function main() {
  mkdirSync(dirname(OUTPUT), { recursive: true })

  const db = new BetterSqlite3(OUTPUT)
  db.exec('PRAGMA journal_mode = MEMORY')
  db.exec(`
    DROP TABLE IF EXISTS Adobe_variablesTable;
    DROP TABLE IF EXISTS AgInternedExifCameraModel;
    DROP TABLE IF EXISTS AgInternedExifLens;
    DROP TABLE IF EXISTS AgInternedExifCameraSerialNumber;
    DROP TABLE IF EXISTS AgLibraryFile;
    DROP TABLE IF EXISTS Adobe_images;
    DROP TABLE IF EXISTS AgHarvestedExifMetadata;
    DROP TABLE IF EXISTS Adobe_imageDevelopSettings;
    DROP TABLE IF EXISTS AgHarvestedDevelopMetadata;
    DROP TABLE IF EXISTS AgLibraryKeyword;
    DROP TABLE IF EXISTS AgLibraryKeywordImage;
    DROP TABLE IF EXISTS AgLibraryCollection;
    DROP TABLE IF EXISTS AgLibraryCollectionImage;

    CREATE TABLE Adobe_variablesTable (name TEXT, value TEXT);
    INSERT INTO Adobe_variablesTable VALUES ('Adobe_DBVersion', '14');

    CREATE TABLE AgInternedExifCameraModel (id_local INTEGER PRIMARY KEY, value TEXT);
    CREATE TABLE AgInternedExifLens (id_local INTEGER PRIMARY KEY, value TEXT);
    CREATE TABLE AgInternedExifCameraSerialNumber (id_local INTEGER PRIMARY KEY, value TEXT);
    CREATE TABLE AgLibraryFile (id_local INTEGER PRIMARY KEY, missing INTEGER DEFAULT 0, pathFromRoot TEXT);

    CREATE TABLE Adobe_images (
      id_local INTEGER PRIMARY KEY, rootFile INTEGER, captureTime TEXT,
      rating INTEGER, pick INTEGER DEFAULT 0, colorLabels TEXT
    );
    CREATE TABLE AgHarvestedExifMetadata (
      image INTEGER, cameraModelRef INTEGER, lensRef INTEGER,
      cameraSerialNumberRef INTEGER, focalLength REAL, aperture REAL,
      isoSpeedRating INTEGER, shutterSpeed REAL,
      gpsLatitude REAL, gpsLongitude REAL, hasGPS INTEGER DEFAULT 0
    );
    CREATE TABLE Adobe_imageDevelopSettings (image INTEGER, text TEXT);
    CREATE TABLE AgHarvestedDevelopMetadata (image INTEGER, hasDevelopAdjustments INTEGER DEFAULT 0);

    CREATE TABLE AgLibraryKeyword (id_local INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE AgLibraryKeywordImage (tag INTEGER, image INTEGER);

    CREATE TABLE AgLibraryCollection (id_local INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE AgLibraryCollectionImage (collection INTEGER, image INTEGER);
  `)

  // Intern bodies, lenses, serials
  const bodyId: Record<string, number> = {}
  const serialId: Record<string, number> = {}
  const lensId: Record<string, number> = {}

  const insertBody = db.prepare('INSERT INTO AgInternedExifCameraModel (value) VALUES (?)')
  const insertSerial = db.prepare('INSERT INTO AgInternedExifCameraSerialNumber (value) VALUES (?)')
  const insertLens = db.prepare('INSERT INTO AgInternedExifLens (value) VALUES (?)')

  for (const b of BODIES) {
    bodyId[b.name] = Number(insertBody.run(b.name).lastInsertRowid)
    serialId[b.serial] = Number(insertSerial.run(b.serial).lastInsertRowid)
  }
  for (const l of [...ZOOM_LENSES, ...PRIME_LENSES, FUJI_FIXED_LENS]) {
    lensId[l.name] = Number(insertLens.run(l.name).lastInsertRowid)
  }

  // Intern keywords
  const insertKw = db.prepare('INSERT INTO AgLibraryKeyword (name) VALUES (?)')
  const kwId: Record<string, number> = {}
  for (const k of [...COMMON_KEYWORDS, ...RARE_KEYWORDS]) {
    kwId[k] = Number(insertKw.run(k).lastInsertRowid)
  }

  const insertFile = db.prepare('INSERT INTO AgLibraryFile (id_local, missing, pathFromRoot) VALUES (?, ?, ?)')
  const insertImage = db.prepare(`
    INSERT INTO Adobe_images (id_local, rootFile, captureTime, rating, pick, colorLabels)
    VALUES (?, ?, ?, ?, ?, '')`)
  const insertExif = db.prepare(`
    INSERT INTO AgHarvestedExifMetadata
      (image, cameraModelRef, lensRef, cameraSerialNumberRef, focalLength, aperture, isoSpeedRating, shutterSpeed, gpsLatitude, gpsLongitude, hasGPS)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const insertDev = db.prepare('INSERT INTO Adobe_imageDevelopSettings (image, text) VALUES (?, ?)')
  const insertHDev = db.prepare('INSERT INTO AgHarvestedDevelopMetadata (image, hasDevelopAdjustments) VALUES (?, 1)')
  const insertKwImg = db.prepare('INSERT INTO AgLibraryKeywordImage (tag, image) VALUES (?, ?)')

  const rng = makeRng(SEED)
  const photosPerYear = Math.floor(TOTAL_PHOTOS / YEARS.length)

  const insertAll = db.transaction(() => {
    let nextId = 1
    for (const year of YEARS) {
      for (let i = 0; i < photosPerYear; i++) {
        const id = nextId++

        // Body / lens selection.
        const body = pick(rng, BODIES)
        let lensName: string
        let focalMm: number
        let maxOpen: number
        if (body.fixed) {
          lensName = FUJI_FIXED_LENS.name
          focalMm = FUJI_FIXED_LENS.focal
          maxOpen = FUJI_FIXED_LENS.maxAperture
        } else if (rng() < 0.7) {
          // 70% zoom
          const zoom = pick(rng, ZOOM_LENSES)
          lensName = zoom.name
          focalMm = Math.round(zoom.min + rng() * (zoom.max - zoom.min))
          maxOpen = zoom.maxAperture
        } else {
          const prime = pick(rng, PRIME_LENSES)
          lensName = prime.name
          focalMm = prime.focal
          maxOpen = prime.maxAperture
        }

        const aperture = pickAperture(rng, maxOpen)
        const iso = pick(rng, [100, 200, 400, 800, 1600, 3200])
        const shutter = pick(rng, [1 / 30, 1 / 60, 1 / 125, 1 / 250, 1 / 500, 1 / 1000])

        const dayOfYear = Math.floor(rng() * 360)
        const hour = clamp(Math.floor(rng() * 24), 0, 23)
        const captureTime = isoDate(year, dayOfYear, hour)

        // GPS on ~40% of photos, clustered in 4 scenic regions.
        let lat: number | null = null
        let lng: number | null = null
        let hasGps = 0
        if (rng() < 0.4) {
          const c = pick(rng, GPS_CLUSTERS)
          lat = c.lat + (rng() - 0.5) * 0.05
          lng = c.lng + (rng() - 0.5) * 0.05
          hasGps = 1
        }

        const r = rating(rng)

        insertFile.run(id, 0, `${year}/folder/IMG_${String(id).padStart(5, '0')}.NEF`)
        insertImage.run(id, id, captureTime, r, 0)
        insertExif.run(
          id, bodyId[body.name], lensId[lensName], serialId[body.serial],
          focalMm, aperture, iso, shutter,
          lat, lng, hasGps,
        )

        // ~60% of photos have develop-settings text blobs.
        if (rng() < 0.6) {
          insertDev.run(id, makeDevelopSettings(rng))
          insertHDev.run(id)
        }

        // 5 common keywords applied to ~50% of photos each.
        for (const k of COMMON_KEYWORDS) {
          if (rng() < 0.5) insertKwImg.run(kwId[k], id)
        }
      }
    }

    // Apply rare keywords to <3 photos each — exercises the PII guard.
    // Total rare-keyword applications = 30 * 2 = 60; rng-driven selection.
    for (const k of RARE_KEYWORDS) {
      const count = 1 + Math.floor(rng() * 2) // 1..2 photos per rare keyword
      for (let i = 0; i < count; i++) {
        const photoId = 1 + Math.floor(rng() * (TOTAL_PHOTOS))
        insertKwImg.run(kwId[k], photoId)
      }
    }
  })

  insertAll()
  db.exec('VACUUM')
  db.close()

  console.log(`Wrote demo catalog: ${OUTPUT}`)
}

main()
