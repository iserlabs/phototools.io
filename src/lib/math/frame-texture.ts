import type { TexturePreset } from '@/app/[locale]/frame-studio/_components/types'
import { roundRectPath } from '@/lib/utils/round-rect'

interface TextureConfig {
  baseColor: [number, number, number]
  noiseAmount: number
  noiseScale: number
}

export const TEXTURE_PRESETS: Record<TexturePreset, TextureConfig> = {
  linen: { baseColor: [240, 234, 224], noiseAmount: 15, noiseScale: 1 },
  'film-grain': { baseColor: [30, 30, 30], noiseAmount: 40, noiseScale: 1 },
  canvas: { baseColor: [225, 218, 200], noiseAmount: 25, noiseScale: 2 },
  paper: { baseColor: [250, 248, 242], noiseAmount: 8, noiseScale: 1 },
  wood: { baseColor: [160, 120, 80], noiseAmount: 30, noiseScale: 3 },
  marble: { baseColor: [235, 235, 235], noiseAmount: 20, noiseScale: 4 },
}

export function drawTextureBorder(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  texture: TexturePreset,
  cornerRadius: number,
): void {
  const config = TEXTURE_PRESETS[texture]
  const pattern = generateTexture(config, canvasW, canvasH)

  if (cornerRadius > 0) {
    ctx.save()
    roundRectPath(ctx, 0, 0, canvasW, canvasH, cornerRadius)
    ctx.clip()
    ctx.drawImage(pattern as HTMLCanvasElement, 0, 0)
    ctx.restore()
  } else {
    ctx.drawImage(pattern as HTMLCanvasElement, 0, 0)
  }
}

export function generateTexture(
  config: TextureConfig,
  w: number,
  h: number,
): HTMLCanvasElement | OffscreenCanvas {
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(w, h)
    : document.createElement('canvas')

  if ('width' in canvas && !(canvas instanceof OffscreenCanvas)) {
    canvas.width = w
    canvas.height = h
  }

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const imageData = ctx.createImageData(w, h)
  const data = imageData.data

  const [br, bg, bb] = config.baseColor
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * config.noiseAmount * 2
    data[i] = Math.max(0, Math.min(255, br + noise))
    data[i + 1] = Math.max(0, Math.min(255, bg + noise))
    data[i + 2] = Math.max(0, Math.min(255, bb + noise))
    data[i + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}
