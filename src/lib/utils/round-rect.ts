/**
 * Begins a new path on `ctx` containing a rounded rectangle.
 *
 * Use this instead of calling `ctx.roundRect(x, y, w, h, r)` directly:
 *
 * - Chromium 97/98 shipped `roundRect` behind the experimental-features flag
 *   with a sequence-only `radii` parameter. Some Android vendor browsers
 *   (Honor Browser / Baidu T7 engine on Chromium 97) ship that build with the
 *   flag enabled and throw
 *   "Failed to execute 'roundRect' ... cannot be converted to a sequence"
 *   when handed a bare number (PHOTOTOOLS-1C / PHOTOTOOLS-1D). The
 *   one-element array form is valid in every implementation, old and new.
 * - Safari < 16.4, Firefox < 112 and Chrome < 99 have no `roundRect` at all,
 *   so fall back to `arcTo`.
 *
 * The radius is clamped to `[0, min(w, h) / 2]` so both branches draw the
 * same shape and neither can throw on a negative or oversized radius.
 */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Number.isFinite(r) ? Math.max(0, Math.min(r, w / 2, h / 2)) : 0
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, [radius])
    return
  }
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.arcTo(x + w, y, x + w, y + radius, radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius)
  ctx.lineTo(x + radius, y + h)
  ctx.arcTo(x, y + h, x, y + h - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
}
