/**
 * Draw a shareable cheat-sheet card onto a canvas (1080×1350, 4:5 — prints
 * cleanly and posts well). All strings arrive pre-translated; canvas text
 * rendering uses system fonts, so every locale (CJK, Cyrillic, Thai…)
 * renders without font embedding. Fixed dark palette keeps exports
 * consistent regardless of the site theme.
 */

export interface CheatSheetCanvasData {
  siteName: string
  scenarioName: string
  rows: Array<{ label: string; value: string }>
  tipsTitle: string
  tips: string[]
}

const W = 1080
const H = 1350
const PAD = 72

const BG = '#0f1216'
const CARD = '#161b22'
const BORDER = '#2a313b'
const TEXT = '#e6e9ee'
const MUTED = '#8b949e'
const ACCENT = '#e8a33d'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

export function buildCheatSheetCanvas(canvas: HTMLCanvasElement, data: CheatSheetCanvasData): void {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // Header
  ctx.fillStyle = ACCENT
  ctx.font = `600 30px ${FONT}`
  ctx.fillText(data.siteName.toUpperCase(), PAD, PAD + 30)

  ctx.fillStyle = TEXT
  ctx.font = `700 64px ${FONT}`
  ctx.fillText(data.scenarioName, PAD, PAD + 118)

  ctx.strokeStyle = BORDER
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, PAD + 160)
  ctx.lineTo(W - PAD, PAD + 160)
  ctx.stroke()

  // Settings rows
  let y = PAD + 240
  const rowGap = 96
  for (const row of data.rows) {
    ctx.fillStyle = MUTED
    ctx.font = `500 26px ${FONT}`
    ctx.fillText(row.label.toUpperCase(), PAD, y)

    ctx.fillStyle = TEXT
    ctx.font = `600 40px ${FONT}`
    ctx.fillText(row.value, PAD, y + 46)

    y += rowGap
  }

  // Tips card
  y += 24
  const tipsTop = y
  ctx.fillStyle = CARD
  const tipsHeight = H - tipsTop - PAD - 60
  ctx.beginPath()
  ctx.roundRect(PAD, tipsTop, W - PAD * 2, tipsHeight, 16)
  ctx.fill()
  ctx.strokeStyle = BORDER
  ctx.stroke()

  ctx.fillStyle = ACCENT
  ctx.font = `600 28px ${FONT}`
  ctx.fillText(data.tipsTitle.toUpperCase(), PAD + 36, tipsTop + 56)

  ctx.font = `400 28px ${FONT}`
  let tipY = tipsTop + 110
  for (const tip of data.tips) {
    ctx.fillStyle = ACCENT
    ctx.fillText('•', PAD + 36, tipY)
    ctx.fillStyle = TEXT
    for (const line of wrapText(ctx, tip, W - PAD * 2 - 110)) {
      ctx.fillText(line, PAD + 70, tipY)
      tipY += 40
    }
    tipY += 18
  }

  // Footer
  ctx.fillStyle = MUTED
  ctx.font = `500 24px ${FONT}`
  ctx.fillText('phototools.io', PAD, H - PAD + 10)
}
