import type { PaletteSwatch } from '@/lib/math/color-fit'
import type { AnalysisPhoto } from './useSampling'
import type { Sample } from './analyzerState'

/**
 * Composes photo (with numbered markers) + wheel + palette row into one PNG-ready canvas.
 * Layout: [photo | wheel] on top, swatch pills below. Photo is omitted when null.
 */
export function buildColorExportCanvas(o: {
  wheelCanvas: HTMLCanvasElement
  exportCanvas: HTMLCanvasElement
  swatches: PaletteSwatch[]
  photo: AnalysisPhoto | null
  samples: Sample[]
  title: string
}) {
  const dpr = window.devicePixelRatio || 1
  const wheelSize = o.wheelCanvas.width / dpr
  const margin = 24, headerH = 28, gap = 16, pillH = 40, pillGap = 6, labelH = 14

  let photoW = 0, photoH = 0
  if (o.photo) {
    const scale = wheelSize / o.photo.height
    photoH = wheelSize
    photoW = Math.round(o.photo.width * scale)
  }
  const contentW = photoW + (photoW ? gap : 0) + wheelSize
  const totalW = contentW + margin * 2
  const topY = margin + headerH
  const paletteY = topY + wheelSize + margin
  const totalH = paletteY + labelH + pillH + 20 + margin

  const c = o.exportCanvas
  c.width = totalW * dpr; c.height = totalH * dpr
  c.style.width = `${totalW}px`; c.style.height = `${totalH}px`
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, totalW, totalH)

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px system-ui, sans-serif'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(o.title, margin, margin)

  let x = margin
  if (o.photo) {
    ctx.drawImage(o.photo.canvas, x, topY, photoW, photoH)
    o.samples.forEach((s, i) => {
      const px = x + s.x * photoW, py = topY + s.y * photoH
      ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2)
      ctx.fillStyle = `rgb(${s.rgb.r}, ${s.rgb.g}, ${s.rgb.b})`; ctx.fill()
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3
      ctx.strokeText(String(i + 1), px, py); ctx.fillText(String(i + 1), px, py)
    })
    x += photoW + gap
  }
  ctx.drawImage(o.wheelCanvas, x, topY, wheelSize, wheelSize)

  const pillW = (totalW - margin * 2 - (o.swatches.length - 1) * pillGap) / Math.max(1, o.swatches.length)
  let px = margin
  const pillTop = paletteY + labelH
  for (const s of o.swatches) {
    if (s.isKey) {
      ctx.fillStyle = '#aaaaaa'; ctx.font = '10px system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.fillText('Key', px + pillW / 2, pillTop - 3)
    }
    const r = 6
    ctx.beginPath()
    ctx.moveTo(px + r, pillTop); ctx.lineTo(px + pillW - r, pillTop)
    ctx.quadraticCurveTo(px + pillW, pillTop, px + pillW, pillTop + r)
    ctx.lineTo(px + pillW, pillTop + pillH - r)
    ctx.quadraticCurveTo(px + pillW, pillTop + pillH, px + pillW - r, pillTop + pillH)
    ctx.lineTo(px + r, pillTop + pillH)
    ctx.quadraticCurveTo(px, pillTop + pillH, px, pillTop + pillH - r)
    ctx.lineTo(px, pillTop + r)
    ctx.quadraticCurveTo(px, pillTop, px + r, pillTop)
    ctx.closePath(); ctx.fillStyle = s.hex; ctx.fill()
    if (s.isKey) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke() }
    ctx.fillStyle = '#aaa'; ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(s.hex, px + pillW / 2, pillTop + pillH + 4)
    px += pillW + pillGap
  }
}
