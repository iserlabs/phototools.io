import type { SensorPreset } from '@/lib/types'

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

export const SENSORS: SensorPreset[] = [
  { id: 'mf_645', name: 'Medium Format (54x40)', cropFactor: 0.64, w: 53.4, h: 40.0, color: '#a855f7' },
  { id: 'mf', name: 'Medium Format (44x33)', cropFactor: 0.79, w: 43.8, h: 32.9, color: '#8b5cf6' },
  { id: 'mf_leica', name: 'Medium Format (45x30)', cropFactor: 0.80, w: 45.0, h: 30.0, color: '#d946ef' },
  { id: 'ff', name: 'Full Frame', cropFactor: 1.0, w: 36, h: 24, color: '#3b82f6' },
  { id: 'apsh', name: 'APS-H', cropFactor: 1.26, w: 28.5, h: 19, color: '#06b6d4' },
  { id: 'apsc_n', name: 'APS-C (1.5x)', cropFactor: 1.53, w: 23.5, h: 15.6, color: '#10b981' },
  { id: 'apsc_c', name: 'APS-C (Canon)', cropFactor: 1.61, w: 22.3, h: 14.9, color: '#f59e0b' },
  { id: 'm43', name: 'Micro Four Thirds', cropFactor: 2.0, w: 17.3, h: 13, color: '#ef4444' },
  { id: '1in', name: '1" Sensor', cropFactor: 2.7, w: 13.2, h: 8.8, color: '#ec4899' },
  { id: 'phone', name: 'Smartphone Flagship (1/1.3")', cropFactor: 3.5, w: 9.8, h: 7.3, color: '#8b5cf6' },
]

export function getSensor(id: string): SensorPreset {
  return SENSORS.find((s) => s.id === id) ?? SENSORS[3] // Adjusted default to 'ff' at index 3
}

export const POPULAR_MODELS: Record<string, string[]> = {
  mf_645: ['Phase One IQ4 150MP'],
  mf: ['Hasselblad X2D', 'Fujifilm GFX 100S II'],
  mf_leica: ['Leica S3'],
  ff: ['Sony A7 IV', 'Nikon Z8', 'Canon R5', 'Leica Q3'],
  apsh: ['Canon EOS-1D Mark IV', 'Canon EOS-1D Mark III'],
  apsc_n: ['Sony A6700', 'Fujifilm X-T5', 'Nikon Z50II', 'Leica CL'],
  apsc_c: ['Canon R7', 'Canon R10'],
  m43: ['OM System OM-1', 'Panasonic GH6'],
  '1in': ['Sony RX100 VII'],
  phone: ['iPhone 16 Pro', 'Samsung S24 Ultra'],
}

export type MpEntry = { mp: number; models: string }

export const COMMON_MP: Record<string, MpEntry[]> = {
  mf_645: [
    { mp: 150, models: 'Phase One IQ4' },
  ],
  mf: [
    { mp: 50, models: 'Fujifilm GFX 50S II / Pentax 645Z' },
    { mp: 100, models: 'Hasselblad X2D / GFX 100S II' },
  ],
  mf_leica: [
    { mp: 64, models: 'Leica S3' },
  ],
  ff: [
    { mp: 12, models: 'Sony A7S III' },
    { mp: 20, models: 'Canon R6' },
    { mp: 24, models: 'Sony A7 III / Nikon Z6 III' },
    { mp: 33, models: 'Sony A7 IV' },
    { mp: 45, models: 'Canon R5 / Nikon Z9' },
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
    { mp: 20, models: 'OM System OM-1 / Lumix G9' },
    { mp: 25, models: 'Lumix GH6 / Lumix G9 II' },
  ],
  '1in': [{ mp: 20, models: 'Sony RX100 V/VI/VII' }],
  phone: [
    { mp: 12, models: 'iPhone 14' },
    { mp: 48, models: 'iPhone 15 / iPhone 16 Pro' },
    { mp: 108, models: 'Samsung S22 Ultra' },
    { mp: 200, models: 'Samsung S23 Ultra / S24 Ultra' },
  ],
}

export type SensorSpec = {
  isoRange: string
  dynamicRange: number
  typicalUse: string
  notableFeature: string
}

export const SENSOR_SPECS: Record<string, SensorSpec> = {
  mf_645:   { isoRange: '64–25600',    dynamicRange: 15.0, typicalUse: 'Studio / landscape',     notableFeature: 'Highest resolving power' },
  mf:       { isoRange: '64–102400',   dynamicRange: 14.8, typicalUse: 'Studio / landscape',     notableFeature: 'Wide dynamic range' },
  mf_leica: { isoRange: '50–100000',   dynamicRange: 14.5, typicalUse: 'Reportage / landscape',  notableFeature: '3:2 medium format' },
  ff:       { isoRange: '50–204800',   dynamicRange: 14.7, typicalUse: 'General / professional',  notableFeature: 'Best low-light balance' },
  apsh:     { isoRange: '100–51200',   dynamicRange: 13.5, typicalUse: 'Cinema / hybrid',        notableFeature: 'Super 35 cine standard' },
  apsc_n:   { isoRange: '100–51200',   dynamicRange: 13.8, typicalUse: 'Enthusiast / travel',    notableFeature: 'Reach advantage (1.5×)' },
  apsc_c:   { isoRange: '100–51200',   dynamicRange: 13.5, typicalUse: 'Enthusiast / video',     notableFeature: '1.6× crop factor' },
  m43:      { isoRange: '200–25600',   dynamicRange: 12.8, typicalUse: 'Travel / wildlife',      notableFeature: 'Compact system, 2× reach' },
  '1in':    { isoRange: '125–12800',   dynamicRange: 12.0, typicalUse: 'Compact / drone',        notableFeature: 'Pocketable quality' },
  phone:    { isoRange: '50–6400',     dynamicRange: 10.5, typicalUse: 'Everyday / social',      notableFeature: 'Computational HDR' },
}
