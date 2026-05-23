import { describe, expect, it } from 'vitest'
import BetterSqlite3 from 'better-sqlite3'
import { cropFactorForModel, populateCropFactorTable } from './crop-factor'

function adapt(db: BetterSqlite3.Database) {
  return {
    exec: (sql: string) => db.exec(sql),
    selectObjects: (sql: string, params: unknown[] = []) => db.prepare(sql).all(...params),
  }
}

describe('cropFactorForModel', () => {
  it('returns 1.0 for known full-frame model names', () => {
    expect(cropFactorForModel('Sony A7 IV')).toBeCloseTo(1.0, 2)
    expect(cropFactorForModel('Nikon Z8')).toBeCloseTo(1.0, 2)
  })

  it('returns ~1.5 for known APS-C (non-Canon) model names', () => {
    expect(cropFactorForModel('Fujifilm X-T5')).toBeGreaterThan(1.4)
    expect(cropFactorForModel('Fujifilm X-T5')).toBeLessThan(1.7)
    expect(cropFactorForModel('Sony A6700')).toBeGreaterThan(1.4)
  })

  it('returns ~1.6 for known Canon APS-C model names', () => {
    expect(cropFactorForModel('Canon R7')).toBeGreaterThan(1.5)
    expect(cropFactorForModel('Canon R7')).toBeLessThan(1.7)
  })

  it('returns 2.0 for Micro Four Thirds model names', () => {
    expect(cropFactorForModel('OM System OM-1')).toBeCloseTo(2.0, 1)
    expect(cropFactorForModel('Panasonic GH6')).toBeCloseTo(2.0, 1)
  })

  // -- heuristic fallback for unknown / EXIF-style model strings --

  it('heuristically detects Fujifilm X-series as APS-C', () => {
    expect(cropFactorForModel('X-H2S')).toBeCloseTo(1.5, 1)
    expect(cropFactorForModel('FUJIFILM X100V')).toBeCloseTo(1.5, 1)
  })

  it('heuristically detects Canon APS-C bodies', () => {
    expect(cropFactorForModel('Canon EOS 90D')).toBeCloseTo(1.6, 1)
    expect(cropFactorForModel('Canon EOS R10')).toBeCloseTo(1.6, 1)
  })

  it('heuristically detects Micro Four Thirds bodies', () => {
    expect(cropFactorForModel('OM-5')).toBeCloseTo(2.0, 1)
    expect(cropFactorForModel('DC-GH5')).toBeCloseTo(2.0, 1)
    expect(cropFactorForModel('E-M1 Mark III')).toBeCloseTo(2.0, 1)
  })

  it('detects Sony APS-C EXIF model codes (ILCE-6xxx / NEX)', () => {
    expect(cropFactorForModel('ILCE-6700')).toBeCloseTo(1.5, 1)
    expect(cropFactorForModel('NEX-7')).toBeCloseTo(1.5, 1)
  })

  it('treats Sony full-frame ILCE-7/ILCE-9/ILCE-1 codes as full-frame', () => {
    expect(cropFactorForModel('ILCE-7RM5')).toBeCloseTo(1.0, 2)
    expect(cropFactorForModel('ILCE-1')).toBeCloseTo(1.0, 2)
  })

  it('defaults to full-frame (1.0) for unrecognized model strings', () => {
    expect(cropFactorForModel('Totally Unknown Camera')).toBeCloseTo(1.0, 2)
    expect(cropFactorForModel('')).toBeCloseTo(1.0, 2)
    expect(cropFactorForModel(null)).toBeCloseTo(1.0, 2)
  })
})

describe('populateCropFactorTable', () => {
  it('builds AgSensorCropFactor keyed by camera model id_local', () => {
    const db = new BetterSqlite3(':memory:')
    db.exec(`
      CREATE TABLE AgInternedExifCameraModel (id_local INTEGER PRIMARY KEY, value TEXT);
      INSERT INTO AgInternedExifCameraModel VALUES (1, 'ILCE-7RM5');
      INSERT INTO AgInternedExifCameraModel VALUES (2, 'FUJIFILM X100V');
      INSERT INTO AgInternedExifCameraModel VALUES (3, 'OM-1');
    `)
    populateCropFactorTable(adapt(db))
    const rows = db.prepare('SELECT cameraModelRef, cropFactor FROM AgSensorCropFactor ORDER BY cameraModelRef').all() as Array<{ cameraModelRef: number; cropFactor: number }>
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({ cameraModelRef: 1, cropFactor: expect.closeTo(1.0, 2) })
    expect(rows[1].cropFactor).toBeGreaterThan(1.4) // Fuji APS-C
    expect(rows[1].cropFactor).toBeLessThan(1.7)
    expect(rows[2].cropFactor).toBeCloseTo(2.0, 1) // m43
    db.close()
  })

  it('is idempotent — re-running drops and rebuilds without doubling rows', () => {
    const db = new BetterSqlite3(':memory:')
    db.exec(`
      CREATE TABLE AgInternedExifCameraModel (id_local INTEGER PRIMARY KEY, value TEXT);
      INSERT INTO AgInternedExifCameraModel VALUES (1, 'Nikon Z8');
    `)
    populateCropFactorTable(adapt(db))
    populateCropFactorTable(adapt(db))
    const count = (db.prepare('SELECT COUNT(*) AS n FROM AgSensorCropFactor').get() as { n: number }).n
    expect(count).toBe(1)
    db.close()
  })

  it('handles an empty camera-model table', () => {
    const db = new BetterSqlite3(':memory:')
    db.exec(`CREATE TABLE AgInternedExifCameraModel (id_local INTEGER PRIMARY KEY, value TEXT);`)
    populateCropFactorTable(adapt(db))
    const count = (db.prepare('SELECT COUNT(*) AS n FROM AgSensorCropFactor').get() as { n: number }).n
    expect(count).toBe(0)
    db.close()
  })
})
