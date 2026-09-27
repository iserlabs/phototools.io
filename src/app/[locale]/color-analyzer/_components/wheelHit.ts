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
