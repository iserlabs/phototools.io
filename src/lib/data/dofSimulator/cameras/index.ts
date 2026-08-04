import type { DofCamera } from '../types'
import { CANON_CAMERAS } from './canon'
import { NIKON_CAMERAS } from './nikon'
import { SONY_CAMERAS } from './sony'
import { FUJIFILM_CAMERAS } from './fujifilm'
import { PANASONIC_CAMERAS } from './panasonic'
import { OM_SYSTEM_CAMERAS } from './om-system'
import { LEICA_CAMERAS } from './leica'
import { PENTAX_CAMERAS } from './pentax'

export const DOF_CAMERAS: DofCamera[] = [
  ...CANON_CAMERAS, ...NIKON_CAMERAS, ...SONY_CAMERAS, ...FUJIFILM_CAMERAS,
  ...PANASONIC_CAMERAS, ...OM_SYSTEM_CAMERAS, ...LEICA_CAMERAS, ...PENTAX_CAMERAS,
].sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model))

export const CAMERA_BRANDS: string[] = [...new Set(DOF_CAMERAS.map((c) => c.brand))]

export function getCameraById(id: string): DofCamera | undefined {
  return DOF_CAMERAS.find((c) => c.id === id)
}
