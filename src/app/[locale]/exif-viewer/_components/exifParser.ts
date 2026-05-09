import type ExifReader from 'exifreader'
import { calcEV } from '@/lib/math/exposure'
import { diffractionLimitedAperture, pixelPitch } from '@/lib/math/diffraction'
import { DASH } from './exifTypes'
import {
  EXPOSURE_PROGRAMS, METERING_MODES, FLASH_MODES, WHITE_BALANCE, COLOR_SPACES,
} from '@/lib/data/exifViewer'
import type { ExifResult } from './exifTypes'

function getTagValue(tags: ExifReader.Tags, key: string): string | undefined {
  const tag = tags[key]
  if (!tag) return undefined
  if ('description' in tag && typeof tag.description === 'string' && tag.description) return tag.description
  if ('value' in tag) {
    const v = tag.value as unknown
    if (typeof v === 'string') return v
    if (typeof v === 'number') return String(v)
    if (Array.isArray(v) && v.length > 0) return String(v[0])
  }
  return undefined
}

function getTagNumeric(tags: ExifReader.Tags, key: string): number | null {
  const raw = getTagValue(tags, key)
  if (!raw) return null
  const num = parseFloat(raw)
  return isNaN(num) ? null : num
}

function formatExposureTime(raw: string | undefined): string {
  if (!raw) return DASH
  const num = parseFloat(raw)
  if (isNaN(num)) return raw
  if (num >= 1) return `${num}s`
  return `1/${Math.round(1 / num)}s`
}

function formatFNumber(raw: string | undefined): string {
  if (!raw) return DASH
  const num = parseFloat(raw)
  return isNaN(num) ? raw : `f/${num}`
}

function formatFocalLength(raw: string | undefined): string {
  if (!raw) return DASH
  const num = parseFloat(raw)
  return isNaN(num) ? raw : `${num}mm`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatAspectRatio(w: number, h: number): string {
  const ratio = w / h
  if (Math.abs(ratio - 1.5) < 0.02) return '3:2'
  if (Math.abs(ratio - 1.333) < 0.02) return '4:3'
  if (Math.abs(ratio - 1.778) < 0.02) return '16:9'
  if (Math.abs(ratio - 1) < 0.02) return '1:1'
  if (Math.abs(ratio - 0.667) < 0.02) return '2:3'
  if (Math.abs(ratio - 0.75) < 0.02) return '3:4'
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

function evDescriptionKey(ev: number): string {
  if (ev >= 15) return 'evBrightSunlight'
  if (ev >= 13) return 'evOvercast'
  if (ev >= 11) return 'evOpenShade'
  if (ev >= 8) return 'evBrightIndoor'
  if (ev >= 6) return 'evIndoor'
  if (ev >= 4) return 'evDimIndoor'
  if (ev >= 2) return 'evNightStreet'
  if (ev >= 0) return 'evDimNight'
  return 'evVeryDark'
}

function parseFlash(tags: ExifReader.Tags): string {
  const tag = tags['Flash']
  if (!tag) return DASH
  if ('value' in tag) {
    const v = tag.value as unknown
    const num = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v) : Array.isArray(v) ? parseInt(String(v[0])) : NaN
    if (!isNaN(num) && num in FLASH_MODES) return FLASH_MODES[num]
  }
  if ('description' in tag && typeof tag.description === 'string') return tag.description
  return DASH
}

function parseGps(tags: ExifReader.Tags): { latitude: string; longitude: string } | null {
  const lat = tags['GPSLatitude'], lon = tags['GPSLongitude']
  if (!lat || !lon) return null
  const latDesc = 'description' in lat ? lat.description : undefined
  const lonDesc = 'description' in lon ? lon.description : undefined
  if (typeof latDesc === 'string' && typeof lonDesc === 'string' && latDesc && lonDesc) {
    return { latitude: `${latDesc}\u00B0`, longitude: `${lonDesc}\u00B0` }
  }
  return null
}

export function parseExif(tags: ExifReader.Tags, fileSize: number): ExifResult {
  const fNumberRaw = getTagNumeric(tags, 'FNumber')
  const exposureTimeRaw = getTagNumeric(tags, 'ExposureTime')
  const isoRaw = getTagNumeric(tags, 'ISOSpeedRatings') ?? getTagNumeric(tags, 'PhotographicSensitivity')
  const focalLengthRaw = getTagNumeric(tags, 'FocalLength')
  const widthRaw = getTagNumeric(tags, 'ImageWidth') ?? getTagNumeric(tags, 'PixelXDimension')
  const heightRaw = getTagNumeric(tags, 'ImageHeight') ?? getTagNumeric(tags, 'PixelYDimension')

  let ev: string | null = null, evDesc: string | null = null
  if (fNumberRaw && exposureTimeRaw) {
    const evVal = calcEV(fNumberRaw, exposureTimeRaw)
    const totalEV = isoRaw ? evVal + Math.log2(isoRaw / 100) : evVal
    ev = `EV ${totalEV.toFixed(1)}`
    evDesc = evDescriptionKey(totalEV)
  }

  let diffractionWarning: string | null = null
  if (fNumberRaw && focalLengthRaw && widthRaw && heightRaw) {
    const focalLength35Raw = getTagNumeric(tags, 'FocalLengthIn35mmFilm')
    if (focalLength35Raw && focalLength35Raw > 0) {
      const cropFactor = focalLength35Raw / focalLengthRaw
      const sensorWidth = 36 / cropFactor
      const mp = (widthRaw * heightRaw) / 1e6
      const pitch = pixelPitch(sensorWidth, mp)
      const limitAperture = diffractionLimitedAperture(pitch)
      if (fNumberRaw > limitAperture) {
        diffractionWarning = `Shot at f/${fNumberRaw} — past diffraction limit f/${limitAperture.toFixed(1)}. Sharpness may be reduced.`
      }
    }
  }

  let megapixels = DASH, aspectRatio = DASH
  if (widthRaw && heightRaw) {
    megapixels = `${((widthRaw * heightRaw) / 1e6).toFixed(1)} MP`
    aspectRatio = formatAspectRatio(widthRaw, heightRaw)
  }

  return {
    camera: { make: getTagValue(tags, 'Make') ?? DASH, model: getTagValue(tags, 'Model') ?? DASH },
    lens: { model: getTagValue(tags, 'LensModel') ?? DASH, make: getTagValue(tags, 'LensMake') ?? DASH },
    settings: {
      fNumber: formatFNumber(getTagValue(tags, 'FNumber')), fNumberRaw,
      exposureTime: formatExposureTime(getTagValue(tags, 'ExposureTime')), exposureTimeRaw,
      iso: isoRaw ? String(isoRaw) : DASH, isoRaw,
      focalLength: formatFocalLength(getTagValue(tags, 'FocalLength')), focalLengthRaw,
      focalLength35: formatFocalLength(getTagValue(tags, 'FocalLengthIn35mmFilm')),
      exposureProgram: EXPOSURE_PROGRAMS[getTagValue(tags, 'ExposureProgram') ?? ''] ?? getTagValue(tags, 'ExposureProgram') ?? DASH,
      meteringMode: METERING_MODES[getTagValue(tags, 'MeteringMode') ?? ''] ?? getTagValue(tags, 'MeteringMode') ?? DASH,
      flash: parseFlash(tags),
      whiteBalance: WHITE_BALANCE[getTagValue(tags, 'WhiteBalance') ?? ''] ?? getTagValue(tags, 'WhiteBalance') ?? DASH,
      focusDistance: getTagValue(tags, 'SubjectDistance') ?? getTagValue(tags, 'FocusDistance') ?? DASH,
    },
    image: {
      width: widthRaw ? String(widthRaw) : DASH, widthRaw,
      height: heightRaw ? String(heightRaw) : DASH, heightRaw,
      orientation: getTagValue(tags, 'Orientation') ?? DASH,
      colorSpace: COLOR_SPACES[getTagValue(tags, 'ColorSpace') ?? ''] ?? getTagValue(tags, 'ColorSpace') ?? DASH,
      megapixels, aspectRatio,
    },
    file: { size: formatFileSize(fileSize) },
    date: getTagValue(tags, 'DateTimeOriginal') ?? getTagValue(tags, 'DateTime') ?? DASH,
    gps: parseGps(tags),
    software: getTagValue(tags, 'Software') ?? DASH,
    analysis: { ev, evDescription: evDesc, diffractionWarning },
  }
}
