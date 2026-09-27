import { hueToPos } from './drawWheel'

export interface WheelPoint { id: string; hue: number; r: number }

export function pointerToPolar(px: number, py: number, cx: number, cy: number, radius: number) {
  const dx = px - cx
  const dy = py - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  let hue = Math.atan2(dx, -dy) * (180 / Math.PI)
  if (hue < 0) hue += 360
  return { hue: Math.round(hue) % 360, r: Math.round(Math.min(dist / radius, 1) * 100), inside: dist <= radius }
}

export function hitTest(points: WheelPoint[], px: number, py: number, cx: number, cy: number, radius: number, hitRadius: number): string | null {
  let best: string | null = null
  let bestD = hitRadius
  for (const p of points) {
    const pos = hueToPos(p.hue, p.r, cx, cy, radius)
    const d = Math.hypot(px - pos.x, py - pos.y)
    if (d < bestD) { bestD = d; best = p.id }
  }
  return best
}

export type PressAction = { select: string | null; dragTarget: string | null }

/**
 * What a press on the wheel does outside key mode. Dots are hit first; in custom
 * mode a custom target shares its sample's id and sits under that dot in guide
 * view, so pressing the dot both selects it and starts dragging its target —
 * but only when that target is actually under the pointer, so a tap on a dot
 * whose target was dragged elsewhere doesn't snap the target back.
 */
export function resolvePress(
  dots: WheelPoint[], targets: WheelPoint[], customDraggable: boolean,
  px: number, py: number, cx: number, cy: number, radius: number, hitRadius: number,
): PressAction {
  const dot = hitTest(dots, px, py, cx, cy, radius, hitRadius)
  if (dot) {
    const hitTarget = customDraggable ? hitTest(targets, px, py, cx, cy, radius, hitRadius) : null
    const dragTarget = hitTarget === dot ? dot : null
    return { select: dot, dragTarget }
  }
  if (!customDraggable) return { select: null, dragTarget: null }
  return { select: null, dragTarget: hitTest(targets, px, py, cx, cy, radius, hitRadius) }
}
