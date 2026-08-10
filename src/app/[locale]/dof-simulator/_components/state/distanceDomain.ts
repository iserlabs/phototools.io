/**
 * Canonical subject-distance domain for the DOF simulator's state layer —
 * the single source of truth `paramSchema.ts` (URL param bounds),
 * `framingActions.ts` (the clamp applied by changeDistance/changeFocalLength's
 * lock-FOV re-solve), and `DistancePanel.tsx` (the slider + numeric input)
 * all consume, so a value solved anywhere in that range (e.g. the Full-body
 * framing preset at a long focal length, which can solve to ~85m) is always
 * representable and editable everywhere else.
 *
 * `ruler/rulerScale.ts` deliberately keeps its OWN narrower [0.3, 50] range —
 * that's a display scale for the ruler graphic, not the state domain, and is
 * documented as such at its definition (dof-simulator-rebuild final fix
 * wave, B4).
 */
export const DIST_MIN = 0.1
export const DIST_MAX = 100
