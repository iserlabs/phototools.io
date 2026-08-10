import { distanceForFraming, flForFraming, clampTo } from '@/lib/math/framingSolver'
import { getLensById } from '@/lib/data/dofSimulator/lenses'
import { TELECONVERTERS } from '@/lib/data/dofSimulator/teleconverters'
import { FRAMING_PRESETS } from '@/lib/data/dofSimulator/framing'
import { DIST_MIN, DIST_MAX } from './distanceDomain'
import type { FramingPresetDef } from '@/lib/data/dofSimulator/types'
import type { OpticsApi } from './useOptics'
import type { FramingApi } from './useFraming'

// FL bounds without a lens attached — matches PARAM_SCHEMA's fl/b_fl range and
// the LensPanel slider range (Task 20).
const FL_BOUNDS: readonly [number, number] = [8, 1200]
// Canonical distance domain (distanceDomain.ts) — matches PARAM_SCHEMA's d/b_d
// range and DistancePanel's slider/input bounds.
const DIST_BOUNDS: readonly [number, number] = [DIST_MIN, DIST_MAX]

function flBoundsFor(optics: OpticsApi): readonly [number, number] {
  const lens = optics.lensId ? getLensById(optics.lensId) : undefined
  return lens ? [lens.flMin, lens.flMax] : FL_BOUNDS
}

function tcFactorFor(optics: OpticsApi): number {
  return TELECONVERTERS.find((t) => t.id === optics.teleconverterId)?.flFactor ?? 1
}

/** Solves DISTANCE at the current effective FL so the preset's frame height is met. */
export function applyFramingPreset(
  key: FramingPresetDef['key'],
  optics: OpticsApi,
  framing: FramingApi,
  effectiveFl: number,
  sensorHMm: number
): void {
  const preset = FRAMING_PRESETS.find((p) => p.key === key)
  if (!preset) return
  const d = clampTo(distanceForFraming(preset.frameHeightMm, effectiveFl, sensorHMm), DIST_BOUNDS[0], DIST_BOUNDS[1])
  optics.setDistanceM(d.value)
  framing.setActivePreset(key)
  framing.setLockedFrameHeightMm(preset.frameHeightMm)
}

/** Honors the lens envelope; when lock-FOV is on, re-solves distance to hold framing. */
export function changeFocalLength(
  v: number,
  optics: OpticsApi,
  framing: FramingApi,
  sensorHMm: number
): { clamped: boolean } {
  const [flMin, flMax] = flBoundsFor(optics)
  const flc = clampTo(v, flMin, flMax)
  let clamped = flc.clamped
  optics.setFocalLength(flc.value)

  if (framing.lockFov && framing.lockedFrameHeightMm != null) {
    const tc = tcFactorFor(optics)
    const d = distanceForFraming(framing.lockedFrameHeightMm, flc.value * tc, sensorHMm)
    const dc = clampTo(d, DIST_BOUNDS[0], DIST_BOUNDS[1])
    clamped = clamped || dc.clamped
    optics.setDistanceM(dc.value)
    if (dc.clamped) {
      // Distance hit its bound — re-solve FL back from the clamped distance so
      // framing stays honest (the frame height we can actually hit at that distance).
      const flBack = flForFraming(framing.lockedFrameHeightMm, dc.value, sensorHMm) / tc
      const flBackC = clampTo(flBack, flMin, flMax)
      optics.setFocalLength(flBackC.value)
    }
  }
  return { clamped }
}

/** Mirror image of changeFocalLength: honors distance bounds, re-solves FL under lock-FOV. */
export function changeDistance(
  v: number,
  optics: OpticsApi,
  framing: FramingApi,
  sensorHMm: number
): { clamped: boolean } {
  const dc = clampTo(v, DIST_BOUNDS[0], DIST_BOUNDS[1])
  let clamped = dc.clamped
  optics.setDistanceM(dc.value)

  if (framing.lockFov && framing.lockedFrameHeightMm != null) {
    const [flMin, flMax] = flBoundsFor(optics)
    const tc = tcFactorFor(optics)
    const flEffective = flForFraming(framing.lockedFrameHeightMm, dc.value, sensorHMm)
    const flc = clampTo(flEffective / tc, flMin, flMax)
    clamped = clamped || flc.clamped
    optics.setFocalLength(flc.value)
    if (flc.clamped) {
      // FL hit its bound — re-solve distance back from the clamped FL so framing stays honest.
      const dBack = distanceForFraming(framing.lockedFrameHeightMm, flc.value * tc, sensorHMm)
      const dBackC = clampTo(dBack, DIST_BOUNDS[0], DIST_BOUNDS[1])
      optics.setDistanceM(dBackC.value)
    }
  }
  return { clamped }
}
