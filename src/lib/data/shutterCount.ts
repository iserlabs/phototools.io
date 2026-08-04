/**
 * Shutter-count tool data: rated shutter-life presets, per-brand metadata
 * support, and life-used verdict thresholds.
 *
 * Brand display names are proper nouns (not translated). All prose
 * (explanations, rating labels) lives in the toolUI i18n files.
 */

export interface ShutterRating {
  id: string
  count: number
}

/** Typical manufacturer-rated shutter actuations by camera class. */
export const SHUTTER_RATINGS: ShutterRating[] = [
  { id: 'entry', count: 100_000 },
  { id: 'enthusiast', count: 150_000 },
  { id: 'advanced', count: 200_000 },
  { id: 'pro', count: 300_000 },
  { id: 'flagship', count: 500_000 },
]

export type BrandSupport = 'supported' | 'partial' | 'unsupported'

export interface CameraBrand {
  id: string
  label: string
  support: BrandSupport
  /** Lowercase substrings matched against the EXIF Make tag */
  matches: string[]
}

/**
 * What each brand actually exposes in files:
 * - Nikon writes ShutterCount unencrypted in its MakerNote → supported.
 * - Canon keeps the counter internal (service tools only) → unsupported.
 * - Sony encrypts the MakerNote section that holds it → unsupported.
 * - Pentax obfuscates it with a date-based cipher → unsupported.
 * - Fuji/OM/Panasonic/Leica sometimes carry an ImageNumber-style counter → partial.
 */
export const CAMERA_BRANDS: CameraBrand[] = [
  { id: 'nikon', label: 'Nikon', support: 'supported', matches: ['nikon'] },
  { id: 'canon', label: 'Canon', support: 'unsupported', matches: ['canon'] },
  { id: 'sony', label: 'Sony', support: 'unsupported', matches: ['sony'] },
  { id: 'fujifilm', label: 'Fujifilm', support: 'partial', matches: ['fuji'] },
  { id: 'pentax', label: 'Pentax / Ricoh', support: 'unsupported', matches: ['pentax', 'ricoh'] },
  { id: 'olympus', label: 'OM System / Olympus', support: 'partial', matches: ['olympus', 'om digital'] },
  { id: 'panasonic', label: 'Panasonic', support: 'partial', matches: ['panasonic'] },
  { id: 'leica', label: 'Leica', support: 'partial', matches: ['leica'] },
]

export function matchBrand(make: string | null | undefined): CameraBrand | null {
  if (!make) return null
  const norm = make.toLowerCase()
  return CAMERA_BRANDS.find((b) => b.matches.some((m) => norm.includes(m))) ?? null
}

export type LifeVerdict = 'low' | 'moderate' | 'high' | 'beyond'

/** Verdict bands for shutter life used (fraction of rated actuations). */
export function lifeVerdict(fraction: number): LifeVerdict {
  if (fraction < 0.3) return 'low'
  if (fraction < 0.7) return 'moderate'
  if (fraction <= 1) return 'high'
  return 'beyond'
}
