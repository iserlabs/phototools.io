import type { StackingState } from '../useStackingState'

/**
 * One drawable row — a distance shot's DoF band or a macro slice — normalized
 * so the rest of the diagram doesn't need to branch on mode. `bandEnd` may be
 * `Infinity` for a hyperfocal-final distance shot; `center` is the x-axis
 * value used for the focus dot and as the hover-nearest target.
 */
export interface DiagramRow {
  number: number
  bandStart: number
  bandEnd: number
  center: number
}

export function buildRows(state: StackingState): DiagramRow[] {
  if (state.mode === 'distance') {
    return state.stackingResult.shots.map((shot) => ({
      number: shot.number,
      bandStart: shot.nearFocus,
      bandEnd: shot.farFocus,
      center: shot.focusDistance,
    }))
  }
  return state.macroRows.map((row) => ({
    number: row.number,
    bandStart: row.sliceStartMm,
    bandEnd: row.sliceEndMm,
    // Midpoint of the slice, matching the plan's `railPositionMm + slice/2`.
    center: (row.sliceStartMm + row.sliceEndMm) / 2,
  }))
}
