import {
  type Star, SIDEREAL_DAY,
  drawSky, drawTerrain, drawStarGlow, drawPolaris, drawPolarisSmall,
} from './starDrawing'

function getPolePosition(w: number, h: number, latitude: number) {
  const cx = w / 2
  const cy = h - (latitude / 90) * (h / 2)
  return { cx, cy }
}

function getHorizonY(h: number, latitude: number) {
  if (latitude >= 70) return h + 10
  const t = latitude / 70
  return h * (0.75 + t * 0.3)
}

export function drawSharpScene(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  stars: Star[], latitude: number,
  maxExposure500: number, maxExposureNPF: number, exposurePerFrame: number,
) {
  const horizonFn = (hh: number) => getHorizonY(hh, latitude)
  ctx.clearRect(0, 0, w, h)
  drawSky(ctx, w, h, horizonFn)

  const { cx, cy } = getPolePosition(w, h, latitude)
  const maxR = Math.max(w, h) * 0.9

  for (const star of stars) {
    const r = star.dist * maxR
    const x = cx + Math.cos(star.angle) * r
    const y = cy + Math.sin(star.angle) * r
    drawStarGlow(ctx, x, y, star.radius, star.alpha)
  }

  drawPolaris(ctx, cx, cy)

  const sampleR = maxR * 0.4
  const sampleAngle = Math.PI * 0.75
  const sx = cx + Math.cos(sampleAngle) * sampleR
  const sy = cy + Math.sin(sampleAngle) * sampleR

  if (exposurePerFrame <= maxExposureNPF) {
    ctx.beginPath()
    ctx.arc(sx, sy, 8, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  } else {
    const trailAngle = (exposurePerFrame / SIDEREAL_DAY) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(cx, cy, sampleR, sampleAngle - trailAngle / 2, sampleAngle + trailAngle / 2)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  drawTerrain(ctx, w, h, horizonFn)

  ctx.font = '500 11px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillText(`500 Rule: ${maxExposure500.toFixed(1)}s`, 14, h - 30)
  ctx.fillText(`NPF Rule: ${maxExposureNPF.toFixed(1)}s`, 14, h - 14)
}

export function drawTrailsScene(
  ctx: CanvasRenderingContext2D, w: number, h: number, progress: number,
  stars: Star[], latitude: number, totalExposure: number,
) {
  const horizonFn = (hh: number) => getHorizonY(hh, latitude)
  ctx.clearRect(0, 0, w, h)
  drawSky(ctx, w, h, horizonFn)

  const { cx, cy } = getPolePosition(w, h, latitude)
  const maxR = Math.max(w, h) * 0.9

  const fullArcAngle = (totalExposure / SIDEREAL_DAY) * Math.PI * 2
  const currentArc = fullArcAngle * progress

  for (const star of stars) {
    const r = star.dist * maxR

    ctx.beginPath()
    ctx.arc(cx, cy, r, star.angle, star.angle + currentArc)
    ctx.strokeStyle = `rgba(180, 200, 255, ${star.alpha * 0.15})`
    ctx.lineWidth = star.radius * 3
    ctx.lineCap = 'round'
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, r, star.angle, star.angle + currentArc)
    ctx.strokeStyle = `rgba(255, 255, 255, ${star.alpha * 0.7})`
    ctx.lineWidth = star.radius * 0.8
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  drawPolarisSmall(ctx, cx, cy)
  drawTerrain(ctx, w, h, horizonFn)

  ctx.font = '500 11px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  const arcDeg = ((currentArc * 180) / Math.PI).toFixed(1)
  ctx.fillText(`Arc: ${arcDeg}°`, 14, h - 14)
}
