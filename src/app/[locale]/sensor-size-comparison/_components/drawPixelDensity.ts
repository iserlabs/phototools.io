import type { ResolvedSensor, CustomSensor } from './sensorSizeTypes'
import { COMMON_MP, type MpEntry } from '@/lib/data/sensors'
import { pixelPitch } from '@/lib/math/diffraction'
import { drawPixelGrid, drawEntryLabel } from './drawPixelGrid'

type ColumnGroup = { title: string, color: string, items: { sensor: ResolvedSensor, entries: MpEntry[] }[] }

// Film has no fixed pixel count by design, and cine_s16's only period-correct
// digital reference (Digital Bolex D16) failed Appendix A's currency check
// (see sensors.ts) — neither gets a `COMMON_MP` entry, so both are excluded
// from this mode entirely rather than falling back to a fabricated MP figure.
// Keep in sync with `SensorControlsPanel.hasPixelDensityExcludedSensor`.
function isPixelDensityEligible(s: ResolvedSensor): boolean {
  return s.group !== 'film' && s.id !== 'cine_s16'
}

function buildColumns(sensors: ResolvedSensor[], resolution: number): ColumnGroup[] {
  const columns: ColumnGroup[] = []
  for (const s of sensors.filter(isPixelDensityEligible)) {
    const entries = COMMON_MP[s.id] ?? [{ mp: (s as CustomSensor).mp || resolution, models: '' }]
    if (s.group === 'medium-format') {
      let mfCol = columns.find(c => c.title === 'Medium Format')
      if (!mfCol) { mfCol = { title: 'Medium Format', color: s.color, items: [] }; columns.push(mfCol) }
      mfCol.items.push({ sensor: s, entries })
    } else {
      columns.push({ title: s.name.split(' (')[0], color: s.color, items: [{ sensor: s, entries }] })
    }
  }
  return columns
}

function drawCategoryTitle(ctx: CanvasRenderingContext2D, title: string, color: string, alpha: number, x: number, y: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(title, x, y)
  ctx.restore()
}

function drawMobileGrid(
  ctx: CanvasRenderingContext2D, W: number, pad: number,
  columns: ColumnGroup[], maxSensorW: number, alphaMap?: Map<string, number>,
): number {
  type FlatEntry = { sensor: ResolvedSensor, mp: number, models: string, title?: string }
  const flatEntries: FlatEntry[] = []
  for (const col of columns) {
    let first = true
    for (const item of col.items) {
      for (const entry of item.entries) {
        flatEntries.push({ sensor: item.sensor, mp: entry.mp, models: entry.models, title: first ? col.title : undefined })
        first = false
      }
    }
  }

  const numCols = 2, colGap = 12, rowGap = 12
  const availW = W - pad * 2
  const colW = (availW - colGap * (numCols - 1)) / numCols
  const sensorScale = (colW - 8) / maxSensorW
  const totalRowW = numCols * colW + (numCols - 1) * colGap
  const startX = (W - totalRowW) / 2

  type CategoryGroup = { title: string, color: string, entries: FlatEntry[] }
  const catGroups: CategoryGroup[] = []
  for (const fe of flatEntries) {
    if (fe.title) catGroups.push({ title: fe.title, color: fe.sensor.color, entries: [fe] })
    else catGroups[catGroups.length - 1].entries.push(fe)
  }

  let curY = pad
  for (const group of catGroups) {
    if (curY > pad + 5) curY += 12
    const titleAlpha = alphaMap ? Math.max(...group.entries.map(e => alphaMap.get(e.sensor.id) ?? 1)) : 1
    drawCategoryTitle(ctx, group.title, group.color, titleAlpha, W / 2, curY)
    curY += 20

    for (let ei = 0; ei < group.entries.length; ei += numCols) {
      const rowEntries = group.entries.slice(ei, ei + numCols)
      let rowH = 0
      for (let ci = 0; ci < rowEntries.length; ci++) {
        const fe = rowEntries[ci]
        const s = fe.sensor
        const a = alphaMap?.get(s.id) ?? 1
        const colX = startX + ci * (colW + colGap)
        const sensorPxW = s.w * sensorScale, sensorPxH = s.h * sensorScale
        const pitch = pixelPitch(s.w, fe.mp, s.h)
        const rx = colX + (colW - sensorPxW) / 2

        ctx.save(); ctx.globalAlpha = a
        drawPixelGrid(ctx, s, sensorScale, fe.mp, rx, curY, sensorPxW, sensorPxH)
        const modelLines = drawEntryLabel(ctx, s.color, fe.mp, pitch, fe.models, colX + colW / 2, curY + sensorPxH)
        ctx.restore()

        const entryH = sensorPxH + 20 + Math.max(1, modelLines) * 12
        if (entryH > rowH) rowH = entryH
      }
      curY += rowH + rowGap
    }
  }
  return curY
}

function drawDesktopGrid(
  ctx: CanvasRenderingContext2D, W: number, pad: number,
  columns: ColumnGroup[], maxSensorW: number, alphaMap?: Map<string, number>,
): number {
  const colGap = 24, rowGap = 12
  const colsPerRow = columns.length
  const availW = W - pad * 2
  const colW = Math.min((availW - (colsPerRow - 1) * colGap) / colsPerRow, 140)
  const sensorScale = (colW - 8) / maxSensorW
  const totalRowW = colsPerRow * colW + (colsPerRow - 1) * colGap
  let colX = (W - totalRowW) / 2
  let maxGridY = 0

  for (const col of columns) {
    const colAlpha = alphaMap ? Math.max(...col.items.map(item => alphaMap.get(item.sensor.id) ?? 1)) : 1
    drawCategoryTitle(ctx, col.title, col.color, colAlpha, colX + colW / 2, pad)

    let gridY = pad + 20
    for (const item of col.items) {
      const s = item.sensor
      const a = alphaMap?.get(s.id) ?? 1
      const sensorPxW = s.w * sensorScale, sensorPxH = s.h * sensorScale

      for (const entry of item.entries) {
        const pitch = pixelPitch(s.w, entry.mp, s.h)
        const rx = colX + (colW - sensorPxW) / 2

        ctx.save(); ctx.globalAlpha = a
        drawPixelGrid(ctx, s, sensorScale, entry.mp, rx, gridY, sensorPxW, sensorPxH)
        const modelLines = drawEntryLabel(ctx, s.color, entry.mp, pitch, entry.models, colX + colW / 2, gridY + sensorPxH)
        ctx.restore()

        gridY += sensorPxH + 20 + Math.max(1, modelLines) * 12 + rowGap
      }
    }
    if (gridY > maxGridY) maxGridY = gridY
    colX += colW + colGap
  }

  ctx.textBaseline = 'alphabetic'
  return maxGridY
}

export function drawPixelDensity(
  ctx: CanvasRenderingContext2D, W: number, _H: number, pad: number,
  sensors: ResolvedSensor[], resolution: number, alphaMap?: Map<string, number>,
): number {
  const eligible = sensors.filter(isPixelDensityEligible)
  if (eligible.length === 0) return 0
  const columns = buildColumns(sensors, resolution)
  const maxSensorW = Math.max(...eligible.map((s) => s.w))
  return W < 600
    ? drawMobileGrid(ctx, W, pad, columns, maxSensorW, alphaMap)
    : drawDesktopGrid(ctx, W, pad, columns, maxSensorW, alphaMap)
}
