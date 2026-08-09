import { calcDoF, calcHyperfocal } from './dof'

export interface StackingInput {
  focalLength: number // mm
  aperture: number
  coc: number // mm
  nearLimit: number // meters
  farLimit: number // meters, may be Infinity
  overlapPct: number // 0-1
}

export interface StackingShot {
  number: number
  focusDistance: number // meters
  nearFocus: number // meters
  farFocus: number // meters, Infinity on a hyperfocal final shot
}

export interface StackingResult {
  shots: StackingShot[]
  totalDepth: number // meters, Infinity when farLimit is Infinity
  coverageComplete: boolean
}

const MAX_SHOTS = 100

/**
 * Invert the DoF near-limit formula: given a desired near edge Dn (meters),
 * return the focus distance s (meters) whose DoF starts exactly there.
 * Dn = s(H-f)/(H+s-2f)  ⇒  s = Dn(H-2f)/(H-f-Dn), all in mm.
 * Returns Infinity when Dn >= H-f (no finite focus reaches that near edge).
 */
export function focusForNearLimit(nearEdge: number, focalLength: number, aperture: number, coc: number): number {
  const f = focalLength
  const Dn = nearEdge * 1000
  const H = calcHyperfocal(focalLength, aperture, coc) * 1000
  if (Dn >= H - f) return Infinity
  return (Dn * (H - 2 * f)) / (H - f - Dn) / 1000
}

/**
 * Exact focus-stacking sequence. Each shot's near DoF edge is placed by
 * closed-form inversion: the first on the near limit, each subsequent one at
 * prevFar - overlapPct * (prevFar - prevNear), so the specified overlap holds
 * exactly for every adjacent pair. Terminates at the far limit, at the
 * hyperfocal (farLimit=Infinity), or at the MAX_SHOTS cap (coverageComplete=false).
 */
export function calcStackingSequence(input: StackingInput): StackingResult {
  const { focalLength, aperture, coc, nearLimit, farLimit, overlapPct } = input
  const H = calcHyperfocal(focalLength, aperture, coc)
  // Physically focusable floor: just beyond the lens itself
  let targetNear = Math.max(nearLimit, (focalLength / 1000) * 1.05)
  const shots: StackingShot[] = []
  let coverageComplete = false

  while (shots.length < MAX_SHOTS) {
    const s = focusForNearLimit(targetNear, focalLength, aperture, coc)
    if (!isFinite(s) || s >= H) {
      const dof = calcDoF({ focalLength, aperture, distance: H, coc })
      shots.push({ number: shots.length + 1, focusDistance: H, nearFocus: dof.nearFocus, farFocus: Infinity })
      coverageComplete = true
      break
    }
    const dof = calcDoF({ focalLength, aperture, distance: s, coc })
    shots.push({ number: shots.length + 1, focusDistance: s, nearFocus: dof.nearFocus, farFocus: dof.farFocus })
    if (dof.farFocus >= farLimit) { coverageComplete = true; break }
    const band = dof.farFocus - dof.nearFocus
    const nextNear = dof.farFocus - overlapPct * band
    if (nextNear <= targetNear) break // no forward progress — degenerate inputs
    targetNear = nextNear
  }

  const totalDepth = farLimit === Infinity ? Infinity : farLimit - nearLimit
  return { shots, totalDepth, coverageComplete }
}
