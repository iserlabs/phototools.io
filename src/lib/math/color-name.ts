import { HUE_BAND_KEYS, NEUTRAL, NEUTRAL_KEYS } from '@/lib/data/colorAnalyzer'

const BAND = 360 / HUE_BAND_KEYS.length // 15

export function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360
}

export function hueBandIndex(h: number): number {
  return Math.floor((normalizeHue(h) + BAND / 2) / BAND) % HUE_BAND_KEYS.length
}

export function hueBandKey(h: number): string {
  return HUE_BAND_KEYS[hueBandIndex(h)]
}

export function isNeutral(hsl: { s: number; l: number }): boolean {
  return hsl.s < NEUTRAL.minSat || hsl.l < NEUTRAL.minLight || hsl.l > NEUTRAL.maxLight
}

export function colorNameKey(hsl: { h: number; s: number; l: number }): string {
  if (hsl.l < NEUTRAL.minLight) return NEUTRAL_KEYS.black
  if (hsl.l > NEUTRAL.maxLight) return NEUTRAL_KEYS.white
  if (hsl.s < NEUTRAL.minSat) return NEUTRAL_KEYS.gray
  return hueBandKey(hsl.h)
}

/**
 * The band to name in "nudge toward <band>". If sample and target already share
 * a band, name the band one step further along the direction of travel so the
 * sentence always points somewhere new.
 */
export function directionBandKey(sampleHue: number, targetHue: number, delta: number): string {
  const sampleBand = hueBandIndex(sampleHue)
  const targetBand = hueBandIndex(targetHue)
  if (targetBand !== sampleBand) return HUE_BAND_KEYS[targetBand]
  const step = delta >= 0 ? 1 : -1
  return HUE_BAND_KEYS[(sampleBand + step + HUE_BAND_KEYS.length) % HUE_BAND_KEYS.length]
}
