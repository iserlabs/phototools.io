import type { DofLens } from '../types'
import { CANON_LENSES } from './canon'
import { NIKON_LENSES } from './nikon'
import { SONY_LENSES } from './sony'
import { FUJIFILM_LENSES } from './fujifilm'
import { SIGMA_LENSES } from './sigma'
import { TAMRON_LENSES } from './tamron'
import { PANASONIC_LENSES } from './panasonic'
import { OM_SYSTEM_LENSES } from './om-system'

export const DOF_LENSES: DofLens[] = [
  ...CANON_LENSES, ...NIKON_LENSES, ...SONY_LENSES, ...FUJIFILM_LENSES,
  ...SIGMA_LENSES, ...TAMRON_LENSES, ...PANASONIC_LENSES, ...OM_SYSTEM_LENSES,
].sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model))

export const LENS_BRANDS: string[] = [...new Set(DOF_LENSES.map((l) => l.brand))]

export function getLensById(id: string): DofLens | undefined {
  return DOF_LENSES.find((l) => l.id === id)
}

// Linear-in-stops interpolation of max aperture across a variable-aperture zoom's
// focal-length range. This is a documented approximation — real lenses step through
// discrete aperture values as they zoom, not a smooth curve.
export function maxApertureAt(lens: DofLens, fl: number): number {
  if (lens.flMax === lens.flMin) return lens.apMaxWide
  const t = Math.min(Math.max((fl - lens.flMin) / (lens.flMax - lens.flMin), 0), 1)
  const stopsW = Math.log2(lens.apMaxWide * lens.apMaxWide)
  const stopsT = Math.log2(lens.apMaxTele * lens.apMaxTele)
  return Math.sqrt(2 ** (stopsW + (stopsT - stopsW) * t)) // linear in stops (approximation; real lenses step)
}
