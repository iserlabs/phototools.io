interface LimitLineProps {
  x: number
  label: string
  top: number
  bottom: number
}

/** A dashed vertical marker with a label — near/far limits (distance mode)
 *  or the subject depth boundary (macro mode). */
export function LimitLine({ x, label, top, bottom }: LimitLineProps) {
  return (
    <>
      <line x1={x} y1={top - 10} x2={x} y2={bottom + 8}
        stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
      <text x={x} y={top - 14} fill="var(--accent)" fontSize={10}
        textAnchor="middle" fontWeight={600}>{label}</text>
    </>
  )
}
