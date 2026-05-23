import { POPULAR_MODELS, SENSORS } from '@/lib/data/sensors'

/**
 * Model name -> crop-factor resolution for the focal-length 35mm-equivalent
 * normalization (Audit M-2).
 *
 * `sensors.ts` does NOT map camera models to crop factors directly. It exposes
 * two pieces we combine here:
 *   - SENSORS: sensor-format id -> cropFactor (ff=1.0, apsc_n=1.53, m43=2.0, ...)
 *   - POPULAR_MODELS: sensor-format id -> list of well-known model display names
 *
 * We build an exact-name lookup from POPULAR_MODELS, then fall back to a
 * conservative name-based heuristic for the EXIF model strings real catalogs
 * actually store (e.g. "ILCE-7RM5", "FUJIFILM X100V", "DC-GH5"). When nothing
 * matches we assume full-frame (1.0) — the same COALESCE default the
 * focal-length aggregator already uses, so unknown bodies are simply left
 * un-normalized rather than mis-normalized.
 */

const FORMAT_CROP: Record<string, number> = Object.fromEntries(
  SENSORS.map((s) => [s.id, s.cropFactor]),
)

const APSC_NIKON = FORMAT_CROP.apsc_n ?? 1.53
const APSC_CANON = FORMAT_CROP.apsc_c ?? 1.61
const M43 = FORMAT_CROP.m43 ?? 2.0
const APSH = FORMAT_CROP.apsh ?? 1.26
const ONE_INCH = FORMAT_CROP['1in'] ?? 2.7
const FULL_FRAME = FORMAT_CROP.ff ?? 1.0

// Exact-match table from the curated model lists in sensors.ts.
const EXACT_BY_MODEL: Record<string, number> = (() => {
  const map: Record<string, number> = {}
  for (const [formatId, models] of Object.entries(POPULAR_MODELS)) {
    const cf = FORMAT_CROP[formatId]
    if (cf == null) continue
    for (const model of models) {
      map[normalize(model)] = cf
    }
  }
  return map
})()

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Resolve a crop factor for a camera-model string. Returns 1.0 for unknown
 * or empty input (matches the focal-length aggregator's COALESCE default).
 */
export function cropFactorForModel(model: string | null | undefined): number {
  if (!model) return FULL_FRAME
  const norm = normalize(model)
  if (norm.length === 0) return FULL_FRAME

  // 1. Exact curated match.
  if (EXACT_BY_MODEL[norm] != null) return EXACT_BY_MODEL[norm]

  // 2. Name-based heuristic on the raw + normalized strings.
  // Micro Four Thirds: OM System / Olympus E-M / OM-x / Panasonic Lumix G / DC-G* / DMC-G*.
  if (
    /\bom system\b/.test(norm) ||
    /\bom-\d/.test(norm) ||
    /\be-m\d/.test(norm) ||             // Olympus OM-D E-M1 / E-M5 / E-M10
    /\be-pl?\d/.test(norm) ||           // PEN E-PL / E-P
    /\b(dc|dmc)-g/.test(norm) ||        // Panasonic GH/G/GX/GF bodies
    /\blumix g/.test(norm)
  ) {
    return M43
  }

  // 1" compacts.
  if (/\brx100\b/.test(norm) || /\bzv-1\b/.test(norm)) return ONE_INCH

  // APS-H: older Canon 1D Mark III / IV (the modern 1D X is full-frame).
  if (/\beos-?1d mark (iii|iv)\b/.test(norm)) return APSH

  // Canon APS-C: Rebel / xxxD / xxD / R7 / R10 / R50 / R100 / EOS M.
  if (/\bcanon\b/.test(norm) || /\beos\b/.test(norm)) {
    if (
      /\beos r(7|10|50|100)\b/.test(norm) ||
      /\beos m\d?\b/.test(norm) ||
      /\b(rebel|kiss)\b/.test(norm) ||
      /\beos \d{2,3}d\b/.test(norm) ||     // 90D, 850D, 250D, 7D, 80D ...
      /\beos \d{1,2}d\b/.test(norm)
    ) {
      return APSC_CANON
    }
    return FULL_FRAME
  }

  // Fujifilm X-series (all APS-C; GFX is medium format, handled below).
  if (/\bgfx\b/.test(norm)) return FORMAT_CROP.mf ?? 0.79
  if (/\bfujifilm\b/.test(norm) || /\bx-?[a-z]?\d/.test(norm) || /\bx100\b/.test(norm) || /\bx-pro\b/.test(norm)) {
    return APSC_NIKON
  }

  // Sony: ILCE-6xxx / NEX / A6xxx are APS-C; ILCE-7/9/1, A7/A9/A1 are full-frame.
  if (/\bilce-6\d/.test(norm) || /\bnex\b/.test(norm) || /\ba6\d{3}\b/.test(norm) || /\bilce-3\d/.test(norm)) {
    return APSC_NIKON
  }
  if (/\bilce-(7|9|1)\b/.test(norm) || /\bilce-(7|9)[a-z]/.test(norm) || /\b(a7|a9|a1)\b/.test(norm)) {
    return FULL_FRAME
  }

  // Nikon DX bodies: D3xxx/D5xxx/D7xxx, Z50/Z30/Zfc.
  if (/\bnikon\b/.test(norm) || /\bz\d/.test(norm) || /\bd\d/.test(norm)) {
    if (/\bz(50|30|fc)\b/.test(norm) || /\bd[3579]\d{3}\b/.test(norm)) {
      return APSC_NIKON
    }
    return FULL_FRAME
  }

  // 3. Default: assume full-frame so unknown bodies are left un-normalized.
  return FULL_FRAME
}

interface PopulateDbLike {
  exec: (sql: string) => void
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

/**
 * Audit M-2: build the `AgSensorCropFactor(cameraModelRef, cropFactor)` table
 * inside an open catalog so the focal-length aggregator's
 * `LEFT JOIN AgSensorCropFactor` resolves real crop factors on real catalogs.
 *
 * For every interned camera model, resolve a crop factor from `sensors.ts`
 * (exact match) or the name-based heuristic above, then insert one row keyed
 * by the model's `id_local` (which is what `exif.cameraModelRef` points at).
 *
 * Safe to call once per opened catalog. Drops any pre-existing table first so
 * a re-open never doubles up rows.
 */
export function populateCropFactorTable(db: PopulateDbLike): void {
  db.exec('DROP TABLE IF EXISTS AgSensorCropFactor;')
  db.exec('CREATE TABLE AgSensorCropFactor (cameraModelRef INTEGER, cropFactor REAL);')

  const models = db.selectObjects(
    `SELECT id_local AS id, value FROM AgInternedExifCameraModel`,
  ) as Array<{ id: number; value: string | null }>

  if (models.length === 0) return

  const values = models
    .map((m) => `(${Number(m.id)}, ${cropFactorForModel(m.value)})`)
    .join(', ')
  db.exec(`INSERT INTO AgSensorCropFactor (cameraModelRef, cropFactor) VALUES ${values};`)
}
