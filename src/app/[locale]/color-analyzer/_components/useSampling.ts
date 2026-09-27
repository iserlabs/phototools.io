import { ANALYSIS_LONG_EDGE, CLUSTER, PATCH_SIZE } from '@/lib/data/colorAnalyzer'
import { rgbToHsl } from '@/lib/math/color'
import { isNeutral } from '@/lib/math/color-name'
import { dominantColors } from '@/lib/math/color-cluster'

export interface AnalysisPhoto { canvas: HTMLCanvasElement; width: number; height: number }
export interface SampledColor {
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  neutral: boolean
}

/** Mean RGB of a size×size patch centred on (cx, cy), clamped to the image. */
export function patchAverage(
  data: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, size: number,
): { r: number; g: number; b: number } {
  const half = Math.floor(size / 2)
  const x0 = Math.max(0, cx - half), x1 = Math.min(width - 1, cx + half)
  const y0 = Math.max(0, cy - half), y1 = Math.min(height - 1, cy + half)
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * width + x) * 4
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
  }
  if (n === 0) return { r: 0, g: 0, b: 0 }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}

function fitSize(w: number, h: number, maxLongEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxLongEdge / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

async function decodeWithImg(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('unsupported image'))
    img.src = url
  })
  return { img, url }
}

/**
 * Decode a File to an offscreen canvas no larger than maxLongEdge on its long
 * side. Decodes once via <img> to learn the oriented dimensions (naturalWidth/
 * naturalHeight already reflect EXIF orientation in current browsers), then
 * prefers a single resized createImageBitmap decode of the file; falls back to
 * drawing the same <img> (scaled) if createImageBitmap fails, so the file is
 * never decoded twice.
 */
export async function decodeToAnalysisCanvas(file: File, maxLongEdge = ANALYSIS_LONG_EDGE): Promise<AnalysisPhoto> {
  const { img, url } = await decodeWithImg(file)
  try {
    const size = fitSize(img.naturalWidth, img.naturalHeight, maxLongEdge)
    let source: ImageBitmap | HTMLImageElement
    let w = size.width, h = size.height
    try {
      source = await createImageBitmap(file, {
        imageOrientation: 'from-image',
        resizeWidth: size.width,
        resizeHeight: size.height,
        resizeQuality: 'high',
      })
      w = source.width; h = source.height
    } catch {
      source = img
    }
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('no 2d context')
    ctx.drawImage(source, 0, 0, w, h)
    if ('close' in source) source.close()
    return { canvas, width: w, height: h }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function sampleAt(photo: AnalysisPhoto, x01: number, y01: number): SampledColor {
  const ctx = photo.canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('no 2d context')
  const cx = Math.min(photo.width - 1, Math.max(0, Math.round(x01 * photo.width)))
  const cy = Math.min(photo.height - 1, Math.max(0, Math.round(y01 * photo.height)))
  const half = Math.floor(PATCH_SIZE / 2)
  const x0 = Math.max(0, cx - half), y0 = Math.max(0, cy - half)
  const x1 = Math.min(photo.width - 1, cx + half), y1 = Math.min(photo.height - 1, cy + half)
  const img = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
  const rgb = patchAverage(img.data, img.width, img.height, cx - x0, cy - y0, PATCH_SIZE)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return { rgb, hsl, neutral: isNeutral(hsl) }
}

/** Downscale to CLUSTER.width and run k-means; returns image-relative points. */
export function autoPickPoints(photo: AnalysisPhoto): { x: number; y: number }[] {
  const w = Math.min(CLUSTER.width, photo.width)
  const h = Math.max(1, Math.round((photo.height / photo.width) * w))
  const small = document.createElement('canvas')
  small.width = w; small.height = h
  const ctx = small.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  ctx.drawImage(photo.canvas, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  return dominantColors(data, w, h).map(({ x, y }) => ({ x, y }))
}
