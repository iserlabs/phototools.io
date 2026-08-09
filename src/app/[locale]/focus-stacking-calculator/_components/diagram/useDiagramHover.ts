'use client'

import { useCallback, useRef } from 'react'
import type { DiagramScale } from '../diagramScale'
import type { DiagramRow } from './types'

/**
 * Converts pointer events on the plot overlay rect into the nearest row's
 * index. The SVG scales responsively (width: 100%, viewBox VB_W), so a plain
 * `offsetX` would be wrong the moment the rendered size differs from the
 * viewBox — coordinates are converted through the SVG's own screen CTM
 * instead, which stays correct at any zoom/width.
 */
export function useDiagramHover(
  rows: DiagramRow[],
  scale: DiagramScale,
  setHoveredShot: (i: number | null) => void,
) {
  const svgRef = useRef<SVGSVGElement>(null)

  const onMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const svg = svgRef.current
    if (!svg || rows.length === 0) return
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const { x } = pt.matrixTransform(ctm.inverse())

    let nearest = 0
    let nearestDist = Infinity
    rows.forEach((row, i) => {
      const d = Math.abs(scale.toX(row.center) - x)
      if (d < nearestDist) {
        nearestDist = d
        nearest = i
      }
    })
    setHoveredShot(nearest)
  }, [rows, scale, setHoveredShot])

  const onMouseLeave = useCallback(() => setHoveredShot(null), [setHoveredShot])

  return { svgRef, onMouseMove, onMouseLeave }
}
