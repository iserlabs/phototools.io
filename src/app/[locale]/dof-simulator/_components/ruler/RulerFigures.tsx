// Original, simple SVG silhouettes for the DOF ruler strip — a camera body
// standing in for the photographer at x=0, and a person standing in for the
// draggable subject. Both are authored from scratch as basic shapes (no
// third-party icon sets or artwork); each draws upward from a local origin
// of (0, 0) at its "feet", so callers position it with a single
// `translate(x, groundY)` transform.

interface FigureProps {
  size?: number
}

/** Minimal camera-body silhouette: body + pentaprism hump + lens barrel. */
export function CameraFigure({ size = 30 }: FigureProps) {
  const bodyW = size
  const bodyH = size * 0.6
  const lensR = bodyH * 0.42

  return (
    <g>
      <rect x={-bodyW / 2} y={-bodyH} width={bodyW} height={bodyH} rx={bodyH * 0.2} fill="var(--text-secondary)" />
      <path
        d={`M ${-bodyW * 0.18} ${-bodyH} L ${-bodyW * 0.1} ${-bodyH - bodyH * 0.32} L ${bodyW * 0.1} ${-bodyH - bodyH * 0.32} L ${bodyW * 0.18} ${-bodyH} Z`}
        fill="var(--text-secondary)"
      />
      <circle cx={0} cy={-bodyH * 0.48} r={lensR} fill="var(--bg-primary)" stroke="var(--text-secondary)" strokeWidth={bodyH * 0.1} />
      <circle cx={0} cy={-bodyH * 0.48} r={lensR * 0.45} fill="var(--text-secondary)" opacity={0.6} />
    </g>
  )
}

/** Minimal standing-person silhouette: head circle + tapered torso. */
export function SubjectFigure({ size = 40 }: FigureProps) {
  const h = size
  const shoulderW = size * 0.62
  const hipW = size * 0.4
  const headR = size * 0.15
  const neckY = -h + headR * 2.2

  return (
    <g>
      <circle cx={0} cy={-h + headR} r={headR} fill="currentColor" />
      <path
        d={`M ${-shoulderW / 2} ${neckY} Q 0 ${neckY - headR * 0.6} ${shoulderW / 2} ${neckY} L ${hipW / 2} 0 L ${-hipW / 2} 0 Z`}
        fill="currentColor"
      />
    </g>
  )
}
