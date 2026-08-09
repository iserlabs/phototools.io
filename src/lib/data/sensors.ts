import type { SensorPreset, SensorGroupId } from '@/lib/types'

const FF_DIAG = Math.sqrt(36 * 36 + 24 * 24) // ~43.27mm

/**
 * Standard diagonal-based crop factor.
 * Industry standard: ratio of full-frame diagonal to sensor diagonal.
 */
export function calcCropFactor(w: number, h: number): number {
  return FF_DIAG / Math.sqrt(w * w + h * h)
}

/**
 * Aspect-ratio-aware crop factor.
 * Compares the sensor diagonal against a full-frame crop matched to the
 * sensor's aspect ratio, instead of the full 36x24 diagonal. More accurate
 * for sensors that don't share the 3:2 ratio (e.g., 4:3 Micro Four Thirds).
 */
export function calcAspectCropFactor(w: number, h: number): number {
  const sensorAspect = w / h
  const ffAspect = 36 / 24
  let refW: number, refH: number
  if (sensorAspect >= ffAspect) {
    refW = 36
    refH = 36 / sensorAspect
  } else {
    refH = 24
    refW = 24 * sensorAspect
  }
  return Math.sqrt(refW * refW + refH * refH) / Math.sqrt(w * w + h * h)
}

// Audited against Appendix A (web-verified 2026-08-09): apsh, apsc_c, 1in,
// phone, mf_645 crop factors/dims corrected; apsc_c's 14.8mm height is a
// correction beyond the original design spec's seed data (was 14.9/1.61).
export const SENSORS: SensorPreset[] = [
  { id: 'mf_645', name: 'Medium Format (53.4x40)', cropFactor: 0.65, w: 53.4, h: 40.0, color: '#a855f7', group: 'medium-format' },
  { id: 'mf', name: 'Medium Format (44x33)', cropFactor: 0.79, w: 43.8, h: 32.9, color: '#8b5cf6', group: 'medium-format' },
  { id: 'mf_leica', name: 'Medium Format (45x30)', cropFactor: 0.80, w: 45.0, h: 30.0, color: '#d946ef', group: 'medium-format' },
  { id: 'ff', name: 'Full Frame', cropFactor: 1.0, w: 36, h: 24, color: '#3b82f6', group: 'ff-aps' },
  { id: 'apsh', name: 'APS-H', cropFactor: 1.29, w: 27.9, h: 18.6, color: '#06b6d4', group: 'ff-aps' },
  { id: 'apsc_n', name: 'APS-C (1.5x)', cropFactor: 1.53, w: 23.5, h: 15.6, color: '#10b981', group: 'ff-aps' },
  { id: 'apsc_c', name: 'APS-C (Canon)', cropFactor: 1.62, w: 22.3, h: 14.8, color: '#f59e0b', group: 'ff-aps' },
  { id: 'm43', name: 'Micro Four Thirds', cropFactor: 2.0, w: 17.3, h: 13, color: '#ef4444', group: 'compact' },
  { id: '1in', name: '1" Sensor', cropFactor: 2.73, w: 13.2, h: 8.8, color: '#ec4899', group: 'compact' },
  { id: 'phone', name: 'Smartphone Flagship (1/1.3")', cropFactor: 3.54, w: 9.8, h: 7.3, color: '#ea580c', group: 'phone' },
]

export const EXTENDED_SENSORS: SensorPreset[] = [
  { id: '1_1_7in', name: '1/1.7" Compact', cropFactor: 4.55, w: 7.6, h: 5.7, color: '#14b8a6', group: 'compact' },
  { id: '1_2_3in', name: '1/2.3" (Drones & Action Cams)', cropFactor: 5.64, w: 6.17, h: 4.55, color: '#0d9488', group: 'compact' },
  { id: 'phone_mid', name: 'Smartphone Mid-range (1/2.55")', cropFactor: 6.18, w: 5.6, h: 4.2, color: '#d97706', group: 'phone' },
  { id: 'phone_uw', name: 'Smartphone Ultra-wide (1/3.5")', cropFactor: 8.65, w: 4.0, h: 3.0, color: '#b45309', group: 'phone' },
  { id: 'film_half', name: 'Half-frame Film', cropFactor: 1.44, w: 24, h: 18, color: '#f43f5e', group: 'film' },
  { id: 'film_645', name: '645 Film', cropFactor: 0.62, w: 56, h: 41.5, color: '#be123c', group: 'film' },
  { id: 'film_6x6', name: '6×6 Film', cropFactor: 0.55, w: 56, h: 56, color: '#9f1239', group: 'film' },
  { id: 'film_6x7', name: '6×7 Film', cropFactor: 0.48, w: 70, h: 56, color: '#fda4af', group: 'film' },
  { id: 'film_4x5', name: '4×5 Large Format', cropFactor: 0.28, w: 120, h: 95, color: '#881337', group: 'film' },
  { id: 'cine_s16', name: 'Super 16', cropFactor: 2.97, w: 12.52, h: 7.41, color: '#38bdf8', group: 'cine' },
  { id: 'cine_s35', name: 'Super 35 (16:9)', cropFactor: 1.51, w: 24.9, h: 14.0, color: '#0ea5e9', group: 'cine' },
  { id: 'cine_vv', name: 'RED V-RAPTOR VV', cropFactor: 0.93, w: 40.96, h: 21.6, color: '#0369a1', group: 'cine' },
  { id: 'cine_a65', name: 'ARRI ALEXA 65', cropFactor: 0.72, w: 54.12, h: 25.58, color: '#075985', group: 'cine' },
]

export const ALL_SENSORS: SensorPreset[] = [...SENSORS, ...EXTENDED_SENSORS]

export const SENSOR_GROUP_ORDER: SensorGroupId[] =
  ['medium-format', 'ff-aps', 'compact', 'phone', 'film', 'cine']

export function sensorsInGroup(g: SensorGroupId): SensorPreset[] {
  return ALL_SENSORS.filter(s => s.group === g).sort((a, b) => b.w! * b.h! - a.w! * a.h!)
}

export const COMPARE_PRESETS: { id: string; sensorIds: string[] }[] = [
  { id: 'phone_vs_ff', sensorIds: ['phone', 'phone_mid', 'ff'] },
  { id: 'crop_vs_ff', sensorIds: ['ff', 'apsc_n', 'apsc_c', 'm43'] },
  { id: 'film_vs_digital', sensorIds: ['film_6x7', 'film_645', 'ff', 'm43'] },
  { id: 'mf_family', sensorIds: ['mf_645', 'mf', 'mf_leica', 'film_645'] },
  { id: 'cine_vs_stills', sensorIds: ['cine_a65', 'cine_vv', 'cine_s35', 'ff'] },
]

export function getSensor(id: string): SensorPreset {
  return SENSORS.find((s) => s.id === id) ?? SENSORS.find((s) => s.id === 'ff')!
}

// Model/MP lineups current as of 2026-08-09 (Appendix A, Task 1). phone_mid
// and phone_uw are nominal/representative categories (not single chips), so
// their entries name product lines/module classes rather than one exact SKU.
//
// IMPORTANT: lightroom-catalog-analyzer's crop-factor.ts builds its exact-match
// crop-factor table by iterating ALL of POPULAR_MODELS (not just one format).
// Removing a model string here (not just in `m43`) silently breaks that
// lookup for real EXIF model strings unless a heuristic branch also covers
// it. When refreshing a lineup to a newer model, keep the older name
// alongside it (as done below for mf/apsc_n/phone/m43) rather than replacing
// it outright, unless you also add/verify a heuristic branch in crop-factor.ts.
export const POPULAR_MODELS: Record<string, string[]> = {
  mf_645: ['Phase One IQ4 150MP'],
  mf: ['Hasselblad X2D', 'Hasselblad X2D II 100C', 'Fujifilm GFX 100S II'],
  mf_leica: ['Leica S3'],
  ff: ['Sony A7 IV', 'Sony A7 V', 'Nikon Z8', 'Canon R5 Mark II', 'Leica Q3'],
  apsh: ['Canon EOS-1D Mark IV', 'Canon EOS-1D Mark III'],
  apsc_n: ['Sony A6700', 'Fujifilm X-T5', 'Nikon Z50II', 'Leica CL'],
  apsc_c: ['Canon R7', 'Canon R10'],
  m43: ['OM System OM-1 Mark II', 'Panasonic GH6', 'Panasonic GH7'],
  '1in': ['Sony RX100 VII'],
  phone: ['iPhone 16 Pro', 'iPhone 17 Pro', 'Samsung S24 Ultra', 'Samsung S26 Ultra'],
  '1_1_7in': ['Canon PowerShot S120', 'Panasonic LX7'],
  '1_2_3in': ['DJI Mini 2', 'Nikon P1000'],
  phone_mid: ['Google Pixel a-series', 'Samsung Galaxy A-series'],
  phone_uw: ['iPhone Pro ultra-wide lens', 'Galaxy S Ultra ultra-wide lens'],
  film_half: ['Pentax 17', 'Olympus Pen F (film)'],
  film_645: ['Pentax 645NII', 'Mamiya 645', 'Contax 645'],
  film_6x6: ['Hasselblad 500C/M', 'Rolleiflex 2.8F'],
  film_6x7: ['Pentax 67II', 'Mamiya RB67'],
  film_4x5: ['Graflex Speed Graphic', 'Intrepid 4×5'],
  cine_s16: ['ARRI 416', 'Digital Bolex D16'],
  cine_s35: ['ARRI ALEXA 35', 'Sony VENICE (S35 mode)', 'RED Komodo'],
  cine_vv: ['RED V-RAPTOR [X]', 'RED V-RAPTOR XL [X]'],
  cine_a65: ['ARRI ALEXA 65'],
}

export type MpEntry = { mp: number; models: string }

// No `film_*` or `cine_s16` entries by design: film has no fixed pixel count,
// and cine_s16's only period-correct digital reference (Digital Bolex D16)
// failed Appendix A's currency check (defunct since 2016) and is not a
// defensible MP figure to grid alongside cine_vv/cine_a65.
export const COMMON_MP: Record<string, MpEntry[]> = {
  mf_645: [
    { mp: 150, models: 'Phase One IQ4' },
  ],
  mf: [
    { mp: 50, models: 'Fujifilm GFX 50S II / Pentax 645Z' },
    { mp: 100, models: 'Hasselblad X2D II 100C / GFX 100S II' },
  ],
  mf_leica: [
    { mp: 64, models: 'Leica S3' },
  ],
  ff: [
    { mp: 12, models: 'Sony A7S III' },
    { mp: 20, models: 'Canon R6' },
    { mp: 24, models: 'Sony A7 III / Nikon Z6 III' },
    { mp: 33, models: 'Sony A7 IV / Sony A7 V' },
    { mp: 45, models: 'Canon R5 Mark II / Nikon Z9' },
    { mp: 61, models: 'Sony A7R V / Sigma fp L' },
  ],
  apsh: [
    { mp: 10, models: 'Canon EOS-1D Mark III' },
    { mp: 16, models: 'Canon EOS-1D Mark IV' },
  ],
  apsc_n: [
    { mp: 20, models: 'Nikon Z50 / Z50II' },
    { mp: 24, models: 'Sony A6400' },
    { mp: 26, models: 'Sony A6700 / Fujifilm X-H2S' },
    { mp: 40, models: 'Fujifilm X-T5 / X-H2' },
  ],
  apsc_c: [
    { mp: 24, models: 'Canon R10 / Canon R50' },
    { mp: 32, models: 'Canon R7' },
  ],
  m43: [
    { mp: 16, models: 'Lumix GX85' },
    { mp: 20, models: 'OM System OM-1 Mark II / Lumix G9' },
    { mp: 25, models: 'Lumix GH6 / GH7 / Lumix G9 II' },
  ],
  '1in': [{ mp: 20, models: 'Sony RX100 V/VI/VII' }],
  phone: [
    { mp: 12, models: 'iPhone 14' },
    { mp: 48, models: 'iPhone 16 Pro / iPhone 17 Pro' },
    { mp: 108, models: 'Samsung S22 Ultra' },
    { mp: 200, models: 'Samsung S23 Ultra / S26 Ultra' },
  ],
  '1_1_7in': [
    { mp: 10, models: 'Panasonic LX7' },
    { mp: 12, models: 'Canon PowerShot S120' },
  ],
  '1_2_3in': [
    { mp: 12, models: 'DJI Mini 2' },
    { mp: 16, models: 'Nikon P1000' },
  ],
  phone_mid: [
    { mp: 50, models: 'Typical mid-range main sensor' },
    { mp: 108, models: 'High-res mid-range main sensor' },
  ],
  phone_uw: [
    { mp: 12, models: 'Typical ultra-wide module' },
    { mp: 48, models: 'High-res ultra-wide module' },
  ],
  // 19.9MP: RED's own published spec for KOMODO 6K (6144x3240 effective
  // pixels), confirmed via Film & Digital Times' spec reprint (2026-08-09).
  cine_s35: [{ mp: 19.9, models: 'RED KOMODO 6K S35' }],
  cine_vv: [{ mp: 35.4, models: 'RED V-RAPTOR 8K VV' }],
  cine_a65: [{ mp: 20.3, models: 'ARRI ALEXA 65' }],
}
