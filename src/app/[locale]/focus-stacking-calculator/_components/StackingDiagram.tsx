'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { StackingState } from './useStackingState'

interface StackingDiagramProps {
  state: StackingState
}

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899',
]
const PAD = { top: 28, right: 24, bottom: 40, left: 56 }
const VB_W = 800
const DRAW_W = VB_W - PAD.left - PAD.right
const BAND_H = 18
const BAND_GAP = 3
const MAX_BAND_SHOTS = 20
const COV_H = 32
const COV_COLS = 200
const FOCUS_H = 28

function distToX(d: number, logMin: number, logRange: number): number {
  return PAD.left + ((Math.log(d) - logMin) / logRange) * DRAW_W
}

function generateTicks(min: number, max: number): number[] {
  return [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]
    .filter((d) => d >= min * 0.9 && d <= max * 1.1)
}

function fmtDist(d: number): string {
  return d >= 1 ? `${d}m` : `${Math.round(d * 100)}cm`
}

export function StackingDiagram({ state }: StackingDiagramProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const { stackingResult: result, nearLimit, farLimit } = state
  const { shots } = result
  const showBands = shots.length <= MAX_BAND_SHOTS

  const data = useMemo(() => {
    const allD = shots.flatMap((s) => [s.nearFocus, s.farFocus]).concat(nearLimit, farLimit)
    const minD = Math.max(0.01, Math.min(...allD) * 0.8)
    const maxD = Math.max(...allD) * 1.2
    const logMin = Math.log(minD)
    const logRange = Math.log(maxD) - logMin
    const ticks = generateTicks(minD, maxD)

    const cov = new Array(COV_COLS).fill(0) as number[]
    let maxCov = 0
    for (let c = 0; c < COV_COLS; c++) {
      const d = Math.exp(logMin + (c / (COV_COLS - 1)) * logRange)
      for (const s of shots) {
        if (d >= s.nearFocus && d <= s.farFocus) cov[c]++
      }
      if (cov[c] > maxCov) maxCov = cov[c]
    }
    return { logMin, logRange, ticks, cov, maxCov }
  }, [shots, nearLimit, farLimit])

  const { logMin, logRange, ticks, cov, maxCov } = data

  // Layout vertical sections
  let y = PAD.top
  const covY = y; y += COV_H + 10
  const focusY = y; y += FOCUS_H
  let bandsY = 0
  if (showBands) { y += 10; bandsY = y; y += shots.length * (BAND_H + BAND_GAP) }
  const svgH = y + PAD.bottom

  const nearX = distToX(nearLimit, logMin, logRange)
  const farX = distToX(farLimit, logMin, logRange)
  const colW = DRAW_W / COV_COLS

  const dotR = shots.length <= 10 ? 4 : shots.length <= 30 ? 3 : shots.length <= 60 ? 2.5 : 2
  const step = shots.length <= 40 ? 1 : shots.length <= 80 ? 2 : Math.ceil(shots.length / 40)

  // Deduplicated legend values
  const legendVals = [1, Math.ceil(maxCov / 2), maxCov].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <svg viewBox={`0 0 ${VB_W} ${svgH}`} width="100%"
      style={{ maxWidth: 900, height: 'auto' }} role="img" aria-label={t('diagram')}>
      <rect x={0} y={0} width={VB_W} height={svgH} fill="var(--bg-surface)" rx={8} />

      {/* Near / far limit lines */}
      <line x1={nearX} y1={PAD.top - 10} x2={nearX} y2={svgH - PAD.bottom + 8}
        stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
      <text x={nearX} y={PAD.top - 14} fill="var(--accent)" fontSize={10}
        textAnchor="middle" fontWeight={600}>{t('diagramNear')}</text>
      <line x1={farX} y1={PAD.top - 10} x2={farX} y2={svgH - PAD.bottom + 8}
        stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
      <text x={farX} y={PAD.top - 14} fill="var(--accent)" fontSize={10}
        textAnchor="middle" fontWeight={600}>{t('diagramFar')}</text>

      {/* === Coverage heatmap === */}
      <text x={PAD.left - 8} y={covY + COV_H / 2 + 3} fill="var(--text-secondary)"
        fontSize={9} textAnchor="end" fontWeight={500}>{t('diagramCoverage')}</text>
      {cov.map((count, i) => count > 0 ? (
        <rect key={i} x={PAD.left + i * colW} y={covY} width={colW + 0.5} height={COV_H}
          fill="var(--accent)"
          opacity={0.15 + Math.min(1, count / Math.max(2, maxCov * 0.6)) * 0.55} />
      ) : null)}
      <rect x={PAD.left} y={covY} width={DRAW_W} height={COV_H}
        fill="none" stroke="var(--border)" strokeWidth={1} rx={4} />
      {maxCov > 1 && legendVals.map((count, i) => {
        const lx = VB_W - PAD.right - (legendVals.length - 1 - i) * 44 - 10
        const op = 0.15 + Math.min(1, count / Math.max(2, maxCov * 0.6)) * 0.55
        return (
          <g key={count}>
            <rect x={lx} y={covY - 14} width={12} height={8}
              fill="var(--accent)" opacity={op} rx={2} />
            <text x={lx + 16} y={covY - 7} fill="var(--text-secondary)" fontSize={8}>
              {count}x
            </text>
          </g>
        )
      })}

      {/* === Focus point dots === */}
      <text x={PAD.left - 8} y={focusY + 14} fill="var(--text-secondary)"
        fontSize={9} textAnchor="end" fontWeight={500}>{t('diagramFocusPoints')}</text>
      <line x1={PAD.left} y1={focusY + 14} x2={VB_W - PAD.right} y2={focusY + 14}
        stroke="var(--border)" strokeWidth={1} />
      {shots.map((shot, i) => {
        if (i !== 0 && i !== shots.length - 1 && i % step !== 0) return null
        return (
          <circle key={shot.number} cx={distToX(shot.focusDistance, logMin, logRange)}
            cy={focusY + 14} r={dotR} fill={COLORS[i % COLORS.length]} opacity={0.85} />
        )
      })}
      <text x={VB_W - PAD.right + 4} y={focusY + 17}
        fill="var(--text-secondary)" fontSize={9}>{shots.length}</text>

      {/* === Individual bands (few shots only) === */}
      {showBands && shots.map((shot, i) => {
        const color = COLORS[i % COLORS.length]
        const by = bandsY + i * (BAND_H + BAND_GAP)
        const x1 = distToX(shot.nearFocus, logMin, logRange)
        const x2 = distToX(shot.farFocus, logMin, logRange)
        const bw = Math.max(2, x2 - x1)
        const fx = distToX(shot.focusDistance, logMin, logRange)
        let olW = 0, olX = 0
        if (i > 0) {
          const prev = shots[i - 1]
          if (prev.farFocus > shot.nearFocus) {
            olX = x1
            olW = Math.max(0, distToX(
              Math.min(prev.farFocus, shot.farFocus), logMin, logRange,
            ) - x1)
          }
        }
        return (
          <g key={shot.number}>
            <rect x={x1} y={by} width={bw} height={BAND_H} fill={color} opacity={0.35} rx={3} />
            <rect x={x1} y={by} width={bw} height={BAND_H}
              fill="none" stroke={color} strokeWidth={1.5} rx={3} />
            {olW > 0 && <rect x={olX} y={by} width={olW} height={BAND_H}
              fill={color} opacity={0.15} rx={2} />}
            <circle cx={fx} cy={by + BAND_H / 2} r={3} fill={color} />
            <text x={x1 - 6} y={by + BAND_H / 2 + 4} fill="var(--text-secondary)"
              fontSize={10} textAnchor="end" fontWeight={500}>{shot.number}</text>
          </g>
        )
      })}

      {/* === Distance axis === */}
      {ticks.map((d) => {
        const x = distToX(d, logMin, logRange)
        if (x < PAD.left || x > VB_W - PAD.right) return null
        return (
          <g key={d}>
            <line x1={x} y1={svgH - PAD.bottom} x2={x} y2={svgH - PAD.bottom + 6}
              stroke="var(--text-secondary)" strokeWidth={1} opacity={0.5} />
            <text x={x} y={svgH - PAD.bottom + 18} fill="var(--text-secondary)"
              fontSize={10} textAnchor="middle">{fmtDist(d)}</text>
          </g>
        )
      })}
      <line x1={PAD.left} y1={svgH - PAD.bottom} x2={VB_W - PAD.right} y2={svgH - PAD.bottom}
        stroke="var(--border)" strokeWidth={1} />
    </svg>
  )
}
