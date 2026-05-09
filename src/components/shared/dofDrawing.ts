import { calcCircleOfConfusion } from '@/lib/math/exposure'
import { SCENES, type SceneKey } from './dofScenes'

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, ((num >> 16) & 0xff) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `rgb(${r},${g},${b})`
}

function drawTree(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.fillStyle = '#5a4030'
  ctx.fillRect(cx - size * 0.06, cy, size * 0.12, size * 0.4)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy - size * 0.1, size * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = lighten(color, 20)
  ctx.beginPath()
  ctx.arc(cx - size * 0.08, cy - size * 0.18, size * 0.18, 0, Math.PI * 2)
  ctx.fill()
}

function drawPerson(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  const headR = size * 0.1
  ctx.fillStyle = '#555566'
  ctx.beginPath()
  ctx.ellipse(cx, cy + size * 0.1, size * 0.15, size * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy - size * 0.25, headR, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3a2a1a'
  ctx.beginPath()
  ctx.arc(cx, cy - size * 0.28, headR * 0.9, Math.PI, Math.PI * 2)
  ctx.fill()
}

function drawFlower(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.strokeStyle = '#4a8a3a'
  ctx.lineWidth = size * 0.06
  ctx.beginPath()
  ctx.moveTo(cx, cy + size * 0.3)
  ctx.lineTo(cx, cy + size * 0.8)
  ctx.stroke()
  const petalCount = 6
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2
    const px = cx + Math.cos(angle) * size * 0.25
    const py = cy + Math.sin(angle) * size * 0.25
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(px, py, size * 0.15, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#ffcc00'
  ctx.beginPath()
  ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2)
  ctx.fill()
}

function drawBokehCircles(ctx: CanvasRenderingContext2D, cx: number, cy: number, blurRadius: number, color: string) {
  const count = Math.min(Math.floor(blurRadius / 2), 8)
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + blurRadius * 0.1
    const dist = blurRadius * 0.6 + Math.sin(i * 1.5) * blurRadius * 0.3
    const bx = cx + Math.cos(angle) * dist
    const by = cy + Math.sin(angle) * dist
    const r = blurRadius * 0.3 + Math.sin(i * 2.3) * blurRadius * 0.15
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.12 + Math.sin(i * 1.7) * 0.05
    ctx.beginPath()
    ctx.arc(bx, by, Math.max(r, 2), 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  focusDistance: number,
  aperture: number,
  sceneKey: SceneKey,
) {
  const scene = SCENES[sceneKey]

  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5)
  skyGrad.addColorStop(0, scene.skyColor)
  skyGrad.addColorStop(1, lighten(scene.skyColor, -30))
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, w, h * 0.55)

  const groundGrad = ctx.createLinearGradient(0, h * 0.5, 0, h)
  groundGrad.addColorStop(0, scene.groundColor)
  groundGrad.addColorStop(1, lighten(scene.groundColor, -20))
  ctx.fillStyle = groundGrad
  ctx.fillRect(0, h * 0.5, w, h * 0.5)

  const focusY = h * 0.1 + (1 - focusDistance) * h * 0.8
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 1
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(0, focusY)
  ctx.lineTo(w, focusY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  const sorted = [...scene.objects].sort((a, b) => b.depth - a.depth)

  for (const obj of sorted) {
    const blur = calcCircleOfConfusion(obj.depth, focusDistance, aperture, 20)
    const px = obj.x * w
    const py = obj.y * h

    ctx.save()

    if (blur > 0.5) {
      ctx.filter = `blur(${blur}px)`
    }

    switch (obj.type) {
      case 'circle':
        ctx.fillStyle = obj.color
        ctx.beginPath()
        ctx.arc(px, py, obj.size, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'rect':
        ctx.fillStyle = obj.color
        ctx.fillRect(px - obj.size * 0.5, py - obj.size * 0.3, obj.size, obj.size * 0.6)
        break
      case 'tree':
        drawTree(ctx, px, py, obj.size, obj.color)
        break
      case 'person':
        drawPerson(ctx, px, py, obj.size, obj.color)
        break
      case 'flower':
        drawFlower(ctx, px, py, obj.size, obj.color)
        break
    }

    ctx.filter = 'none'

    if (blur > 5) {
      drawBokehCircles(ctx, px, py, blur, obj.color)
    }

    ctx.restore()
  }
}
