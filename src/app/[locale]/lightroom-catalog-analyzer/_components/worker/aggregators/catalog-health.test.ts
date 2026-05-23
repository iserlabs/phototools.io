import { describe, expect, it } from 'vitest'
import { aggregateCatalogHealth } from './catalog-health'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateCatalogHealth', () => {
  it('counts missing originals and groups them by root folder', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', missing: 1, filePath: '2024/jan/img1.NEF' },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', missing: 1, filePath: '2024/jan/img2.NEF' },
      { id: 3, captureTime: '2024-02-01T10:00:00', cameraModel: 'A', missing: 1, filePath: '2024/feb/img3.NEF' },
      { id: 4, captureTime: '2024-02-02T10:00:00', cameraModel: 'A', missing: 0, filePath: '2024/feb/img4.NEF' },
    ]))
    const r = aggregateCatalogHealth(db)
    expect(r.missingOriginals).toBe(3)
    expect(r.brokenPaths).toBe(3)
    const jan = r.missingByRootFolder.find((f) => f.folder === '2024/jan')
    const feb = r.missingByRootFolder.find((f) => f.folder === '2024/feb')
    expect(jan?.count).toBe(2)
    expect(feb?.count).toBe(1)
  })

  it('detects duplicate clusters by (captureTime, model, focalLength, ISO, aperture, shutter)', () => {
    const db = adaptForAggregators(createTestCatalog([
      // Cluster 1 — 3 photos sharing all EXIF + capture time
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', focalLength: 50, aperture: 1.8, isoSpeedRating: 100, shutterSpeed: 0.004, filePath: 'a/1.NEF' },
      { id: 2, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', focalLength: 50, aperture: 1.8, isoSpeedRating: 100, shutterSpeed: 0.004, filePath: 'a/2.NEF' },
      { id: 3, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', focalLength: 50, aperture: 1.8, isoSpeedRating: 100, shutterSpeed: 0.004, filePath: 'a/3.NEF' },
      // Cluster 2 — 2 photos
      { id: 4, captureTime: '2024-02-01T11:00:00', cameraModel: 'A', focalLength: 35, aperture: 2.8, isoSpeedRating: 400, shutterSpeed: 0.016, filePath: 'b/1.NEF' },
      { id: 5, captureTime: '2024-02-01T11:00:00', cameraModel: 'A', focalLength: 35, aperture: 2.8, isoSpeedRating: 400, shutterSpeed: 0.016, filePath: 'b/2.NEF' },
      // Singleton — same capture time but different aperture
      { id: 6, captureTime: '2024-02-01T11:00:00', cameraModel: 'A', focalLength: 35, aperture: 4.0, isoSpeedRating: 400, shutterSpeed: 0.016, filePath: 'b/3.NEF' },
    ]))
    const r = aggregateCatalogHealth(db)
    expect(r.likelyDuplicates).toBe(5)              // 3 + 2
    expect(r.duplicateClusters.length).toBe(2)
    expect(r.duplicateClusters[0]).toEqual({
      size: 3,
      firstPath: 'a/1.NEF',
      lastPath: 'a/3.NEF',
      captureTime: '2024-01-01T10:00:00',
    })
  })

  it('caps duplicate clusters at 20 entries', () => {
    const photos = []
    for (let cluster = 0; cluster < 25; cluster++) {
      for (let i = 0; i < 2; i++) {
        photos.push({
          id: cluster * 10 + i + 1,
          captureTime: `2024-01-01T10:00:${String(cluster).padStart(2, '0')}`,
          cameraModel: 'A',
          focalLength: 50,
          aperture: 1.8,
          isoSpeedRating: 100,
          shutterSpeed: 0.004,
          filePath: `c${cluster}/${i}.NEF`,
        })
      }
    }
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateCatalogHealth(db)
    expect(r.duplicateClusters.length).toBe(20)
  })

  it('returns zeros on an empty catalog', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    const r = aggregateCatalogHealth(db)
    expect(r.missingOriginals).toBe(0)
    expect(r.missingPreviews).toBe(0)
    expect(r.brokenPaths).toBe(0)
    expect(r.likelyDuplicates).toBe(0)
    expect(r.duplicateClusters).toEqual([])
    expect(r.missingByRootFolder).toEqual([])
  })

  it('always reports 0 missing previews (preview state lives outside the catalog SQLite)', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', missing: 1 },
    ]))
    expect(aggregateCatalogHealth(db).missingPreviews).toBe(0)
  })
})
