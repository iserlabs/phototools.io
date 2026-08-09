interface SceneCameraProps {
  x: number
  groundY: number
  label: string
}

/**
 * Simple body+lens camera glyph resting on a ground line, shared between
 * SceneStrip's distance-mode camera position (to the left of the near
 * limit) and its macro-mode rail start (at the rail's zero position). The
 * lens rect always protrudes toward +x, matching the direction the scene
 * unfolds in both modes.
 */
export function SceneCamera({ x, groundY, label }: SceneCameraProps) {
  const bodyH = 12
  const bodyY = groundY - bodyH
  return (
    <g>
      <rect x={x - 9} y={bodyY} width={18} height={bodyH} rx={2} fill="var(--text-secondary)" />
      <rect x={x + 7} y={bodyY + 3} width={9} height={6} rx={1} fill="var(--text-secondary)" />
      <text x={x} y={bodyY - 6} fill="var(--text-secondary)" fontSize={9}
        textAnchor="middle" fontWeight={500}>{label}</text>
    </g>
  )
}
