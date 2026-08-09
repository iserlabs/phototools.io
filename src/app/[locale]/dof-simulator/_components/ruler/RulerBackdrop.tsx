import { RULER_MAX, distToX, rulerTicks } from './rulerScale'
import { PAD_L, PAD_R, TRACK_W, VB_W, GROUND_Y, BAND_H, AXIS_Y, LABEL_Y, formatMeters, type RulerLabels } from './rulerLayout'
import { CameraFigure } from './RulerFigures'
import styles from './ruler.module.css'

interface RulerBackdropProps {
  nearFocus: number
  farFocus: number
  hyperfocal: number
  labels: RulerLabels
}

/**
 * The non-interactive layer of the ruler: ground gradient, axis ticks, the
 * shaded in-focus band, the hyperfocal marker, and the fixed camera figure.
 * Entirely `aria-hidden` — the draggable subject figure in DofRuler.tsx
 * carries the one meaningful accessible control (a labeled slider).
 */
export function RulerBackdrop({ nearFocus, farFocus, hyperfocal, labels }: RulerBackdropProps) {
  const nearX = PAD_L + distToX(nearFocus, TRACK_W)
  const rawFarX = PAD_L + distToX(farFocus, TRACK_W)
  const farX = Math.max(nearX, rawFarX)
  const hyperX = PAD_L + distToX(hyperfocal, TRACK_W)
  const farIsInfinite = !Number.isFinite(farFocus) || farFocus > RULER_MAX
  const ticks = rulerTicks()

  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id="dofRulerGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--bg-surface)" />
          <stop offset="100%" stopColor="var(--bg-primary)" />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={VB_W} height={AXIS_Y + 16} fill="url(#dofRulerGround)" />
      <line x1={0} y1={GROUND_Y} x2={VB_W} y2={GROUND_Y} stroke="var(--border)" strokeWidth={1} />

      <rect
        x={nearX}
        y={GROUND_Y - BAND_H / 2}
        width={Math.max(0, farX - nearX)}
        height={BAND_H}
        rx={3}
        fill="var(--accent)"
        opacity={0.22}
      />
      <line x1={nearX} y1={GROUND_Y - BAND_H / 2 - 3} x2={nearX} y2={GROUND_Y + BAND_H / 2 + 3} stroke="var(--accent)" strokeWidth={1.5} opacity={0.7} />
      <line x1={farX} y1={GROUND_Y - BAND_H / 2 - 3} x2={farX} y2={GROUND_Y + BAND_H / 2 + 3} stroke="var(--accent)" strokeWidth={1.5} opacity={0.7} />
      <text x={nearX} y={GROUND_Y - BAND_H / 2 - 6} className={styles.boundaryLabel}>{labels.near}</text>
      {farIsInfinite ? (
        <text x={farX + 4} y={GROUND_Y + 3} textAnchor="start" className={styles.infinityLabel}>{labels.infinity}</text>
      ) : (
        <text x={farX} y={GROUND_Y - BAND_H / 2 - 6} className={styles.boundaryLabel}>{labels.far}</text>
      )}

      <line x1={hyperX} y1={8} x2={hyperX} y2={GROUND_Y} stroke="var(--accent-secondary)" strokeWidth={1} strokeDasharray="3 3" opacity={0.8} />
      <text x={hyperX} y={7} className={styles.hyperfocalLabel}>{labels.hyperfocal}</text>

      <g transform={`translate(${PAD_L}, ${GROUND_Y})`}>
        <CameraFigure size={30} />
      </g>

      <line x1={PAD_L} y1={AXIS_Y} x2={VB_W - PAD_R} y2={AXIS_Y} stroke="var(--border)" strokeWidth={1} />
      {ticks.map((m) => {
        const x = PAD_L + distToX(m, TRACK_W)
        return (
          <g key={m}>
            <line x1={x} y1={AXIS_Y - 3} x2={x} y2={AXIS_Y + 3} stroke="var(--text-secondary)" strokeWidth={1} opacity={0.5} />
            <text x={x} y={LABEL_Y} className={styles.tickLabel}>{formatMeters(m, labels.distanceUnit)}</text>
          </g>
        )
      })}
    </g>
  )
}
