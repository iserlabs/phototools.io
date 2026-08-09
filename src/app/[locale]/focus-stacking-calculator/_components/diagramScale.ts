import type { StackingShot } from '@/lib/math/stacking'

export const VB_W = 800
export const DIAGRAM_PAD = { top: 28, right: 24, bottom: 40, left: 56 }

export interface DiagramScale {
  toX: (d: number) => number
  ticks: number[]
  max: number
  infinite: boolean
}

const DISTANCE_TICKS = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]

export function buildDistanceScale(
  shots: StackingShot[], nearLimit: number, farLimit: number, padLeft: number, drawW: number,
): DiagramScale {
  const infinite = farLimit === Infinity
  const finite = shots.flatMap((s) => [s.nearFocus, s.farFocus, s.focusDistance]).filter(isFinite)
  const min = Math.max(0.01, Math.min(nearLimit, ...finite) * 0.8)
  const last = shots[shots.length - 1]
  const max = infinite ? (last ? last.focusDistance * 2 : min * 100) : Math.max(farLimit, ...finite) * 1.2
  const logMin = Math.log(min)
  const logRange = Math.log(max) - logMin
  return {
    max, infinite,
    toX: (d) => padLeft + ((Math.log(Math.min(Math.max(d, min), max)) - logMin) / logRange) * drawW,
    ticks: DISTANCE_TICKS.filter((t) => t >= min * 0.9 && t <= max * 1.1),
  }
}

export function buildMacroScale(
  depthMm: number, lastSliceEndMm: number, padLeft: number, drawW: number,
): DiagramScale {
  const max = Math.max(depthMm, lastSliceEndMm)
  const rawStep = max / 5
  const pow = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 5, 10].map((k) => k * pow).find((s) => s >= rawStep) ?? rawStep
  const ticks: number[] = []
  for (let v = 0; v <= max; v += step) ticks.push(Number(v.toFixed(3)))
  return {
    max, infinite: false,
    toX: (d) => padLeft + (Math.min(Math.max(d, 0), max) / max) * drawW,
    ticks,
  }
}
