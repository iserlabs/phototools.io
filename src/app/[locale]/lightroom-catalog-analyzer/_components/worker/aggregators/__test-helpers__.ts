import BetterSqlite3 from 'better-sqlite3'
import type { Database as BetterSqlite3Database } from 'better-sqlite3'

/**
 * Minimal LrC-shaped schema for aggregator tests.
 * Real LrC has many more columns; we declare only what the aggregators read.
 *
 * The Database returned implements the subset of @sqlite.org/sqlite-wasm's
 * Database interface used by aggregators (selectObject, selectObjects, selectArrays,
 * exec, prepare). better-sqlite3 has a different surface — aggregators
 * use the `.selectObjects(sql, params)` helper that we adapt below.
 */
export interface TestPhoto {
  id: number
  captureTime: string                 // ISO datetime
  rating?: number                     // 0..5
  pick?: -1 | 0 | 1
  colorLabel?: string
  cameraModel?: string
  cameraSerial?: string
  lens?: string
  focalLength?: number                // physical mm
  aperture?: number
  isoSpeedRating?: number
  shutterSpeed?: number               // seconds
  cropFactor?: number                 // applied to focal length for 35mm-equiv
  gpsLat?: number | null
  gpsLng?: number | null
  developSettings?: string | null     // the .text blob
  missing?: 0 | 1
  filePath?: string
}

export function createTestCatalog(photos: TestPhoto[]): BetterSqlite3Database {
  const db = new BetterSqlite3(':memory:')

  db.exec(`
    CREATE TABLE Adobe_variablesTable (
      name TEXT, value TEXT
    );
    INSERT INTO Adobe_variablesTable (name, value) VALUES ('Adobe_DBVersion', '14');

    CREATE TABLE AgInternedExifCameraModel (id_local INTEGER PRIMARY KEY, value TEXT);
    CREATE TABLE AgInternedExifLens (id_local INTEGER PRIMARY KEY, value TEXT);
    CREATE TABLE AgInternedExifCameraSerialNumber (id_local INTEGER PRIMARY KEY, value TEXT);

    -- M-2 (audit): canonical crop-factor normalization table. Declared here so
    -- all downstream test fixtures (Plan 1b focal-length 35mm-equiv) inherit it.
    -- On a real catalog the worker (Plan 1d) builds this from sensors.ts;
    -- in tests we populate it from each photo cropFactor field.
    CREATE TABLE AgSensorCropFactor (cameraModelRef INTEGER, cropFactor REAL);

    CREATE TABLE AgLibraryFile (
      id_local INTEGER PRIMARY KEY,
      missing INTEGER DEFAULT 0,
      pathFromRoot TEXT
    );

    CREATE TABLE Adobe_images (
      id_local INTEGER PRIMARY KEY,
      rootFile INTEGER,
      captureTime TEXT,
      rating INTEGER,
      pick INTEGER DEFAULT 0,
      colorLabels TEXT
    );

    CREATE TABLE AgHarvestedExifMetadata (
      image INTEGER,
      cameraModelRef INTEGER,
      lensRef INTEGER,
      cameraSerialNumberRef INTEGER,
      focalLength REAL,
      aperture REAL,
      isoSpeedRating INTEGER,
      shutterSpeed REAL,
      gpsLatitude REAL,
      gpsLongitude REAL,
      hasGPS INTEGER DEFAULT 0
    );

    CREATE TABLE Adobe_imageDevelopSettings (
      image INTEGER,
      text TEXT
    );

    CREATE TABLE AgHarvestedDevelopMetadata (
      image INTEGER,
      hasDevelopAdjustments INTEGER DEFAULT 0
    );

    CREATE TABLE AgLibraryKeyword (
      id_local INTEGER PRIMARY KEY,
      name TEXT
    );
    CREATE TABLE AgLibraryKeywordImage (
      tag INTEGER,
      image INTEGER
    );

    CREATE TABLE AgLibraryCollection (id_local INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE AgLibraryCollectionImage (collection INTEGER, image INTEGER);
  `)

  // Intern camera / lens / serial helpers
  const internCache: Record<string, Record<string, number>> = { cam: {}, lens: {}, serial: {} }
  function intern(table: string, value: string | undefined, kind: 'cam' | 'lens' | 'serial'): number | null {
    if (!value) return null
    if (internCache[kind][value]) return internCache[kind][value]
    const info = db.prepare(`INSERT INTO ${table} (value) VALUES (?)`).run(value)
    const id = Number(info.lastInsertRowid)
    internCache[kind][value] = id
    return id
  }
  const tableForKind = { cam: 'AgInternedExifCameraModel', lens: 'AgInternedExifLens', serial: 'AgInternedExifCameraSerialNumber' }

  const insertFile = db.prepare(`INSERT INTO AgLibraryFile (id_local, missing, pathFromRoot) VALUES (?, ?, ?)`)
  const insertImage = db.prepare(`
    INSERT INTO Adobe_images (id_local, rootFile, captureTime, rating, pick, colorLabels)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const insertExif = db.prepare(`
    INSERT INTO AgHarvestedExifMetadata (image, cameraModelRef, lensRef, cameraSerialNumberRef, focalLength, aperture, isoSpeedRating, shutterSpeed, gpsLatitude, gpsLongitude, hasGPS)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertDev = db.prepare(`INSERT INTO Adobe_imageDevelopSettings (image, text) VALUES (?, ?)`)
  const insertHarvestedDev = db.prepare(`INSERT INTO AgHarvestedDevelopMetadata (image, hasDevelopAdjustments) VALUES (?, ?)`)
  const insertCropFactor = db.prepare(`INSERT INTO AgSensorCropFactor (cameraModelRef, cropFactor) VALUES (?, ?)`)

  // M-2 (audit): track which cameraModelRefs already have a crop-factor row so we
  // insert one per interned camera model (the table is keyed by cameraModelRef).
  const cropFactorSeen = new Set<number>()

  for (const p of photos) {
    insertFile.run(p.id, p.missing ?? 0, p.filePath ?? `path/${p.id}.NEF`)
    insertImage.run(
      p.id,
      p.id,           // rootFile = same id for simplicity
      p.captureTime,
      p.rating ?? 0,
      p.pick ?? 0,
      p.colorLabel ?? '',
    )
    const camRef = intern(tableForKind.cam, p.cameraModel, 'cam')
    const lensRef = intern(tableForKind.lens, p.lens, 'lens')
    const serialRef = intern(tableForKind.serial, p.cameraSerial, 'serial')
    const hasGps = p.gpsLat != null && p.gpsLng != null ? 1 : 0
    insertExif.run(
      p.id,
      camRef, lensRef, serialRef,
      p.focalLength ?? null,
      p.aperture ?? null,
      p.isoSpeedRating ?? null,
      p.shutterSpeed ?? null,
      p.gpsLat ?? null, p.gpsLng ?? null, hasGps,
    )
    if (p.developSettings !== undefined && p.developSettings !== null) {
      insertDev.run(p.id, p.developSettings)
      insertHarvestedDev.run(p.id, 1)
    }
    // M-2 (audit): populate the crop-factor table from the photo's cropFactor field,
    // keyed by the interned camera model. One row per camera model.
    if (p.cropFactor !== undefined && camRef != null && !cropFactorSeen.has(camRef)) {
      insertCropFactor.run(camRef, p.cropFactor)
      cropFactorSeen.add(camRef)
    }
  }

  return db
}

/**
 * Adapter that gives a better-sqlite3 DB the helper methods aggregators expect
 * (`selectObjects(sql, params)`). Real sqlite-wasm `Database` exposes these natively;
 * better-sqlite3 needs a thin wrapper.
 */
export function adaptForAggregators(db: BetterSqlite3Database): {
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  exec: (sql: string) => void
} {
  return {
    selectObjects(sql, params = []) {
      return db.prepare(sql).all(...params)
    },
    selectObject(sql, params = []) {
      return db.prepare(sql).get(...params)
    },
    exec(sql) {
      db.exec(sql)
    },
  }
}

export type TestDb = ReturnType<typeof adaptForAggregators>
