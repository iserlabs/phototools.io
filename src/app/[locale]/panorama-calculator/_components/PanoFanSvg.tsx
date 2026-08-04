'use client'

/**
 * Top-down fan diagram of a panorama plan: one translucent wedge per frame,
 * rotated by the increment. Overlap regions read darker where wedges stack.
 * For coverage ≤ 180° the camera sits near the bottom edge; wider panos
 * (wedges point backwards too) center the camera mid-canvas.
 */

const W = 400
const H = 235
const MAX_WEDGES = 48

interface PanoFanSvgProps {
  frames: number
  frameFovDeg: number
  incrementDeg: number
  coverageDeg: number
  label: string
}

export function PanoFanSvg({ frames, frameFovDeg, incrementDeg, coverageDeg, label }: PanoFanSvgProps) {
  const wide = coverageDeg > 180
  const cx = W / 2
  const cy = wide ? H / 2 : H - 12
  const r = wide ? H / 2 - 10 : H - 30

  const polar = (angleDeg: number, radius: number): [number, number] => {
    const rad = (angleDeg * Math.PI) / 180
    return [cx + radius * Math.sin(rad), cy - radius * Math.cos(rad)]
  }

  const wedgePath = (centerDeg: number, fovDeg: number): string => {
    const [x1, y1] = polar(centerDeg - fovDeg / 2, r)
    const [x2, y2] = polar(centerDeg + fovDeg / 2, r)
    const largeArc = fovDeg > 180 ? 1 : 0
    return `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`
  }

  const shown = Math.min(frames, MAX_WEDGES)
  const startCenter = -coverageDeg / 2 + frameFovDeg / 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ width: '100%', maxWidth: 560, height: 'auto' }}>
      <path
        d={wedgePath(0, Math.min(coverageDeg, 359.9))}
        fill="none"
        stroke="var(--border)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      {Array.from({ length: shown }, (_, i) => (
        <path
          key={i}
          d={wedgePath(startCenter + i * incrementDeg, frameFovDeg)}
          fill="var(--accent)"
          fillOpacity="0.10"
          stroke="var(--accent)"
          strokeOpacity="0.45"
          strokeWidth="1"
        />
      ))}
      <circle cx={cx} cy={cy} r="4" fill="var(--accent)" />
    </svg>
  )
}
