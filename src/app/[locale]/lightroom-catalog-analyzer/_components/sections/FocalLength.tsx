'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { FocalLengthBlock } from '@/lib/lrcat/types'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { drawFocalLength, type DrawFocalLengthOpts } from './FocalLength.canvas'
import { CALLOUT, COMPACT_LIST, MUTED_LABEL } from './sectionStyles'

const SPLIT_MM = 100
const CANVAS_H = 180

/** Resolve theme tokens from a canvas element for canvas drawing. */
function resolveTheme(canvas: HTMLCanvasElement) {
  const cs = getComputedStyle(canvas)
  return {
    barColor: cs.getPropertyValue('--accent').trim() || undefined,
    axisColor: cs.getPropertyValue('--text-secondary').trim() || undefined,
  }
}

/** Set up a canvas for hi-DPI and draw the focal-length histogram. */
function renderCanvas(
  canvas: HTMLCanvasElement,
  block: FocalLengthBlock,
  extra: Pick<DrawFocalLengthOpts, 'minMm' | 'maxMm'>,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  const { barColor, axisColor } = resolveTheme(canvas)
  drawFocalLength(ctx, block, { width: rect.width, height: rect.height, barColor, axisColor, ...extra })
}

export function FocalLength() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.focal-length')
  const { insightBlob } = useAnalyzer()
  const block = insightBlob?.focalLength ?? null

  const wideRef = useRef<HTMLCanvasElement | null>(null)
  const teleRef = useRef<HTMLCanvasElement | null>(null)

  const wideBlock = useMemo<FocalLengthBlock | null>(() => {
    if (!block) return null
    const histogram = block.histogram.filter((b) => b.mm <= SPLIT_MM)
    const topPeaks = block.topPeaks.filter((p) => p.mm <= SPLIT_MM)
    return { ...block, histogram, topPeaks }
  }, [block])

  const teleBlock = useMemo<FocalLengthBlock | null>(() => {
    if (!block) return null
    const histogram = block.histogram.filter((b) => b.mm > SPLIT_MM)
    if (histogram.length === 0) return null
    const topPeaks = block.topPeaks.filter((p) => p.mm > SPLIT_MM)
    return { ...block, histogram, topPeaks }
  }, [block])

  const draw = useCallback(() => {
    if (wideRef.current && wideBlock) renderCanvas(wideRef.current, wideBlock, { maxMm: SPLIT_MM })
    if (teleRef.current && teleBlock) renderCanvas(teleRef.current, teleBlock, { minMm: SPLIT_MM })
  }, [wideBlock, teleBlock])

  useEffect(() => { draw() }, [draw])

  if (!block) return null

  const min = block.histogram[0]?.mm ?? 0
  const max = block.histogram[block.histogram.length - 1]?.mm ?? 0

  return (
    <section aria-labelledby="focal-length-heading">
      <h2 id="focal-length-heading">{t('title')}</h2>

      <figure>
        <h3>{t('histogramTitle')}</h3>

        <h4 style={MUTED_LABEL}>Wide – 100 mm</h4>
        <canvas
          ref={wideRef}
          role="img"
          aria-label={t('histogramAria')}
          style={{ width: '100%', height: CANVAS_H, display: 'block' }}
        />

        {teleBlock && (
          <>
            <h4 style={{ ...MUTED_LABEL, marginTop: 12 }}>100 mm+</h4>
            <canvas
              ref={teleRef}
              role="img"
              aria-label={t('histogramAria')}
              style={{ width: '100%', height: CANVAS_H, display: 'block' }}
            />
          </>
        )}

        <figcaption className="sr-only">{t('caption', { min, max, peakCount: block.topPeaks.length })}</figcaption>
      </figure>

      <h3>{t('topPeaks')}</h3>
      <ul style={COMPACT_LIST}>
        {block.topPeaks.map((p) => (
          <li key={p.mm}>{t('peakItem', { mm: p.mm, pct: p.pctOfTotal.toFixed(1) })}</li>
        ))}
      </ul>

      <p style={{ ...CALLOUT, margin: '12px 0 0' }}>
        {block.bestOnePrime
          ? t('onePrime', { mm: block.bestOnePrime.mm, pct: block.bestOnePrime.coveragePct.toFixed(0) })
          : t('noPrime')}
      </p>
    </section>
  )
}
