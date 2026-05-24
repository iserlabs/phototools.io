'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
// anchorIdFor no longer needed — the drilldown filter is in the sidebar, not a spine section.
import { drawHeatmap, type HeatmapHitBox } from './Heatmap.canvas'

export interface HeatmapProps {
  /** Optional override for tests; defaults to the one-day filter + scroll bridge. */
  onDayClick?: (date: string) => void
}

export function Heatmap({ onDayClick }: HeatmapProps = {}) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.heatmap')
  const { insightBlob, applyFilter, filter } = useAnalyzer()
  const block = insightBlob?.heatmap ?? null

  function handleDayClick(date: string) {
    if (onDayClick) {
      onDayClick(date)
      return
    }
    // Apply a one-day date filter, preserving any other active dimensions.
    // `filter.ts` compares captureTime as a raw string, so widen to a full day.
    void applyFilter({
      ...(filter ?? {}),
      dateRange: { start: `${date}T00:00:00`, end: `${date}T23:59:59` },
    })
    // The filter now lives in the always-visible sidebar (desktop) or the
    // mobile controls area — no need to scroll to a spine section.
  }
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hitsRef = useRef<HeatmapHitBox[]>([])
  const [tip, setTip] = useState<{ x: number; y: number; box: HeatmapHitBox } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !block) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    hitsRef.current = drawHeatmap(ctx, block, { width: rect.width, height: rect.height })
  }, [block])

  if (!block) return null

  function pick(e: React.MouseEvent<HTMLCanvasElement>): HeatmapHitBox | null {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    // Prefer an exact hit; otherwise snap to the nearest cell within ~one cell so
    // clicks landing in the thin inter-cell gaps still select the intended day.
    let nearest: HeatmapHitBox | null = null
    let nearestDist = Infinity
    for (const box of hitsRef.current) {
      if (x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) return box
      const cx = box.x + box.w / 2
      const cy = box.y + box.h / 2
      const d = Math.hypot(x - cx, y - cy)
      if (d < nearestDist) {
        nearestDist = d
        nearest = box
      }
    }
    return nearestDist <= 16 ? nearest : null
  }

  return (
    <section aria-labelledby="heatmap-heading">
      <h2 id="heatmap-heading">{t('title')}</h2>
      <figure style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('aria')}
          // drawHeatmap lays out ~102px per year (7 rows × 12px + label); size the
          // canvas to that so there's no large empty band below the cells.
          style={{ width: '100%', height: 8 + 110 * block.years.length, display: 'block', cursor: 'pointer' }}
          onMouseMove={(e) => {
            const box = pick(e)
            setTip(box ? { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, box } : null)
          }}
          onMouseLeave={() => setTip(null)}
          onClick={(e) => {
            const box = pick(e)
            if (box) handleDayClick(box.date)
          }}
        />
        {tip && (
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              left: tip.x + 12,
              top: tip.y + 12,
              background: 'var(--bg-surface)',
              padding: '6px 10px',
              borderRadius: 6,
              pointerEvents: 'none',
              fontSize: 12,
            }}
          >
            {t('tooltip', { date: tip.box.date, count: tip.box.count, topLens: tip.box.topLens ?? '—' })}
          </div>
        )}
        <figcaption className="sr-only">{t('caption', { years: block.years.length })}</figcaption>
      </figure>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
        {block.years.map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
    </section>
  )
}
