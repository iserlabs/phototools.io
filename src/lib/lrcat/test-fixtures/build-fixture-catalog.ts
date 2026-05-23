import BetterSqlite3 from 'better-sqlite3'

/**
 * Build a small but pipeline-complete LrC fixture as an in-memory SQLite DB,
 * then serialize it to a Buffer (which the test wraps as ArrayBuffer).
 *
 * Schema mirrors the prod-aggregator query surface — same tables that
 * the `createTestCatalog` helper in `aggregators/__test-helpers__` uses,
 * but with `Adobe_DBVersion = 14` and a handful of photos that exercise
 * every aggregator (rated photos, GPS, develop settings, keywords).
 */
export function buildFixtureBuffer(): ArrayBuffer {
  const db = new BetterSqlite3(':memory:')

  db.exec(`
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

    INSERT INTO AgInternedExifCameraModel VALUES (1, 'Sony A7R V');
    INSERT INTO AgInternedExifLens VALUES (1, '24-70mm f/2.8');
    INSERT INTO AgLibraryKeyword VALUES (1, 'landscape');
  `)

  const insertImage = db.prepare(`
    INSERT INTO Adobe_images (id_local, rootFile, captureTime, rating, pick, colorLabels)
    VALUES (?, ?, ?, ?, ?, '')`)
  const insertFile = db.prepare(`
    INSERT INTO AgLibraryFile (id_local, missing, pathFromRoot)
    VALUES (?, 0, ?)`)
  const insertExif = db.prepare(`
    INSERT INTO AgHarvestedExifMetadata
      (image, cameraModelRef, lensRef, focalLength, aperture, isoSpeedRating, shutterSpeed, gpsLatitude, gpsLongitude, hasGPS)
    VALUES (?, 1, 1, ?, ?, ?, ?, ?, ?, ?)`)
  const insertDev = db.prepare(`INSERT INTO Adobe_imageDevelopSettings (image, text) VALUES (?, ?)`)
  const insertHDev = db.prepare(`INSERT INTO AgHarvestedDevelopMetadata (image, hasDevelopAdjustments) VALUES (?, 1)`)
  const insertKw = db.prepare(`INSERT INTO AgLibraryKeywordImage (tag, image) VALUES (1, ?)`)

  for (let i = 1; i <= 60; i++) {
    const year = 2023 + (i % 3)                       // 2023..2025
    const month = ((i % 12) + 1)
    const day = ((i % 27) + 1)
    const hour = (i * 7) % 24
    const ct = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`
    const rating = i % 7 === 0 ? 5 : 0
    const fl = 24 + (i % 47)
    const ap = 2.8
    const iso = 400
    const ss = 1 / 250
    const hasGps = i % 3 === 0 ? 1 : 0
    const lat = hasGps ? 40.7 + (i % 5) * 0.001 : null
    const lng = hasGps ? -74.0 + (i % 5) * 0.001 : null

    insertImage.run(i, i, ct, rating, 0)
    insertFile.run(i, `2024/path/${i}.NEF`)
    insertExif.run(i, fl, ap, iso, ss, lat, lng, hasGps)
    insertDev.run(i, `s = { Exposure2012 = "0.${i % 9}", HasSettings = true, }`)
    insertHDev.run(i)
    if (i % 4 === 0) insertKw.run(i)
  }

  const buf = db.serialize() as Buffer
  db.close()

  // Copy the Node Buffer into a fresh ArrayBuffer so the consumer can
  // safely transfer it across worker boundaries in real tests.
  const ab = new ArrayBuffer(buf.byteLength)
  new Uint8Array(ab).set(buf)
  return ab
}
