import type ExifReader from 'exifreader'
import { extractShutterCount, type ShutterCountResult } from '@/lib/utils/shutter-count'
import { findCameraRelease } from '@/lib/data/cameraReleases'
import { matchBrand, type CameraBrand } from '@/lib/data/shutterCount'

export interface HealthReport {
  make: string | null
  model: string | null
  /** Canonical display name from the release database, when matched */
  displayModel: string | null
  serial: string | null
  firmware: string | null
  lensModel: string | null
  lensSerial: string | null
  releaseYear: number | null
  bodyAgeYears: number | null
  shotDate: string | null
  ratedActuations: number | null
  brand: CameraBrand | null
  shutter: ShutterCountResult
}

function readTag(tags: ExifReader.Tags, ...keys: string[]): string | null {
  for (const key of keys) {
    const tag = tags[key]
    if (tag && 'description' in tag && typeof tag.description === 'string' && tag.description.trim()) {
      return tag.description.trim()
    }
  }
  return null
}

/** True when the report contains nothing useful (not even a model). */
export function isEmptyReport(report: HealthReport): boolean {
  return !report.make && !report.model && !report.serial && !report.lensModel && report.shutter.count === null
}

export function buildHealthReport(tags: ExifReader.Tags, buffer: ArrayBuffer, now: Date = new Date()): HealthReport {
  const make = readTag(tags, 'Make')
  const model = readTag(tags, 'Model')
  const release = findCameraRelease(model)

  return {
    make,
    model,
    displayModel: release?.model ?? null,
    serial: readTag(tags, 'BodySerialNumber', 'SerialNumber', 'InternalSerialNumber'),
    firmware: readTag(tags, 'Software'),
    lensModel: readTag(tags, 'LensModel', 'Lens'),
    lensSerial: readTag(tags, 'LensSerialNumber'),
    releaseYear: release?.year ?? null,
    bodyAgeYears: release ? Math.max(0, now.getFullYear() - release.year) : null,
    shotDate: readTag(tags, 'DateTimeOriginal', 'DateTime'),
    ratedActuations: release?.ratedActuations ?? null,
    brand: matchBrand(make),
    shutter: extractShutterCount(buffer),
  }
}
