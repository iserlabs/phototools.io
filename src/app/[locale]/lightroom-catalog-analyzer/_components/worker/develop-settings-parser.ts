/**
 * Lightroom Classic stores develop settings in `Adobe_imageDevelopSettings.text`
 * as a Lua-serialized table — NOT JSON, XML, or plist. It uses Lua table
 * literals: `key = "value"`, `key = { ... }`, with tab indentation and no
 * trailing commas on some lines. We parse it with targeted regex extraction
 * instead of a full Lua parser because we only need a handful of known keys,
 * and the format is stable across LrC versions 9-14.
 */
export interface DevelopSettings {
  exposureShiftStops: number
  cropPct: number                // % of original area cropped away (0–100)
  hasLocalAdjustments: boolean
  slidersTouched: number         // count of recognized slider keys with non-default values
}

const TOUCH_SLIDERS = [
  'Exposure2012', 'Contrast2012', 'Highlights2012', 'Shadows2012',
  'Whites2012', 'Blacks2012', 'Clarity2012', 'Dehaze',
  'Vibrance', 'Saturation', 'Texture',
  'Sharpness', 'Tint', 'Temperature',
]

const LOCAL_ADJUSTMENT_MARKERS = [
  'GradientBasedCorrections',
  'CircularGradientBasedCorrections',
  'PaintBasedCorrections',
  'MaskGroupBasedCorrections',
]

const NUM_KEY_RE = (key: string) => new RegExp(`\\b${key}\\s*=\\s*"?(-?[0-9]+(?:\\.[0-9]+)?)"?`)

function readNumber(blob: string, key: string): number | undefined {
  const m = blob.match(NUM_KEY_RE(key))
  return m ? Number(m[1]) : undefined
}

export function parseDevelopSettings(blob: string): DevelopSettings {
  const exposure = readNumber(blob, 'Exposure2012') ?? 0

  const top = readNumber(blob, 'CropTop') ?? 0
  const bottom = readNumber(blob, 'CropBottom') ?? 1
  const left = readNumber(blob, 'CropLeft') ?? 0
  const right = readNumber(blob, 'CropRight') ?? 1
  // remaining area as a fraction (0..1)
  const remaining = Math.max(0, bottom - top) * Math.max(0, right - left)
  const cropPct = Math.max(0, Math.min(100, (1 - remaining) * 100))

  const hasLocalAdjustments = LOCAL_ADJUSTMENT_MARKERS.some((k) => blob.includes(k + ' '))

  let slidersTouched = 0
  for (const key of TOUCH_SLIDERS) {
    const v = readNumber(blob, key)
    if (v !== undefined && v !== 0) slidersTouched++
  }

  return { exposureShiftStops: exposure, cropPct, hasLocalAdjustments, slidersTouched }
}
