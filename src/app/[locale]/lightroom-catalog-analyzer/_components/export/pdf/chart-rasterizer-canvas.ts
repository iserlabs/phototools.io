import type { FocalLengthBlock, GPSBlock, HeatmapBlock } from '@/lib/lrcat/types'
import { drawFocalLength } from '../../sections/FocalLength.canvas'
import { drawHeatmap } from '../../sections/Heatmap.canvas'
import { drawGpsMap, type GeoFeatureCollection } from '../../sections/GpsMap.canvas'

/** Standardized logical chart size for PDF embedding (px). */
export const CHART_W = 800
export const CHART_H = 400
/** Backing-store scale — render at 2× then embed at logical size for crisp print. */
const SCALE = 2

export type CanvasChartKind = 'focalLength' | 'heatmap' | 'gps'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Rasterize a Canvas-based chart to a PNG data URL using the SAME pure draw*()
 * functions the live dashboard uses (Plan 1f). Renders to an OffscreenCanvas at
 * 2× resolution, then converts to PNG.
 *
 * Overloads keep the block type honest per chart kind.
 */
export async function rasterizeCanvasChart(kind: 'focalLength', block: FocalLengthBlock): Promise<string>
export async function rasterizeCanvasChart(kind: 'heatmap', block: HeatmapBlock): Promise<string>
export async function rasterizeCanvasChart(kind: 'gps', block: GPSBlock, world: GeoFeatureCollection | null): Promise<string>
export async function rasterizeCanvasChart(
  kind: CanvasChartKind,
  block: FocalLengthBlock | HeatmapBlock | GPSBlock,
  world: GeoFeatureCollection | null = null,
): Promise<string> {
  const canvas = new OffscreenCanvas(CHART_W * SCALE, CHART_H * SCALE)
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable')
  ctx.scale(SCALE, SCALE)

  const opts = { width: CHART_W, height: CHART_H }
  if (kind === 'focalLength') {
    drawFocalLength(ctx, block as FocalLengthBlock, { ...opts, barColor: '#f59e0b', axisColor: '#666' })
  } else if (kind === 'heatmap') {
    drawHeatmap(ctx, block as HeatmapBlock, { ...opts, textColor: '#666' })
  } else {
    drawGpsMap(ctx, block as GPSBlock, world, { ...opts, background: '#161616', outlineColor: '#444', clusterColor: '#f59e0b' })
  }

  const pngBlob = await canvas.convertToBlob({ type: 'image/png' })
  return blobToDataUrl(pngBlob)
}
