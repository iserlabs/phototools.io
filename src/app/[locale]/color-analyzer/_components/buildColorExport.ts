import type { HarmonyType } from './colorHarmonyHelpers'
import { HARMONY_KEYS } from './colorHarmonyHelpers'

interface Swatch {
  hue: number
  rgb: { r: number; g: number; b: number }
  hex: string
}

export function buildColorExportCanvas(
  wheelCanvas: HTMLCanvasElement,
  exportCanvas: HTMLCanvasElement,
  swatches: Swatch[],
  harmony: HarmonyType,
  baseIndex: number,
  tFn: (key: string) => string,
) {
  const dpr = window.devicePixelRatio || 1
  const wheelSize = wheelCanvas.width / dpr
  const pillH = 40
  const pillGap = 6
  const margin = 24
  const headerH = 28
  const totalW = wheelSize + margin * 2
  const wheelY = margin + headerH
  const paletteY = wheelY + wheelSize + margin
  const pillW = (totalW - margin * 2 - (swatches.length - 1) * pillGap) / swatches.length
  const keyLabelH = 14
  const totalH = paletteY + keyLabelH + pillH + 20 + margin

  exportCanvas.width = totalW * dpr
  exportCanvas.height = totalH * dpr
  exportCanvas.style.width = `${totalW}px`
  exportCanvas.style.height = `${totalH}px`

  const ctx = exportCanvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, totalW, totalH)

  const harmonyKey = HARMONY_KEYS.find((o) => o.value === harmony)?.key ?? harmony
  const harmonyLabel = tFn(harmonyKey)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(harmonyLabel, margin, margin)

  ctx.drawImage(wheelCanvas, margin, wheelY, wheelSize, wheelSize)

  let px = margin
  const pillTop = paletteY + keyLabelH
  for (let i = 0; i < swatches.length; i++) {
    const s = swatches[i]

    if (i === baseIndex) {
      ctx.fillStyle = '#aaaaaa'
      ctx.font = '10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText('Key', px + pillW / 2, pillTop - 3)
    }

    const r = 6
    ctx.beginPath()
    ctx.moveTo(px + r, pillTop)
    ctx.lineTo(px + pillW - r, pillTop)
    ctx.quadraticCurveTo(px + pillW, pillTop, px + pillW, pillTop + r)
    ctx.lineTo(px + pillW, pillTop + pillH - r)
    ctx.quadraticCurveTo(px + pillW, pillTop + pillH, px + pillW - r, pillTop + pillH)
    ctx.lineTo(px + r, pillTop + pillH)
    ctx.quadraticCurveTo(px, pillTop + pillH, px, pillTop + pillH - r)
    ctx.lineTo(px, pillTop + r)
    ctx.quadraticCurveTo(px, pillTop, px + r, pillTop)
    ctx.closePath()
    ctx.fillStyle = s.hex
    ctx.fill()

    if (i === baseIndex) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.fillStyle = '#aaa'
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(s.hex, px + pillW / 2, pillTop + pillH + 4)

    px += pillW + pillGap
  }
}
