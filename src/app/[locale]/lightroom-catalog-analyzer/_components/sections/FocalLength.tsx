'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { drawFocalLength } from './FocalLength.canvas'
import { CALLOUT } from './sectionStyles'

export function FocalLength() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.focal-length')
  const { insightBlob } = useAnalyzer()
  const block = insightBlob?.focalLength ?? null
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

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
    drawFocalLength(ctx, block, { width: rect.width, height: rect.height })
  }, [block])

  if (!block) return null

  const min = block.histogram[0]?.mm ?? 0
  const max = block.histogram[block.histogram.length - 1]?.mm ?? 0

  return (
    <section aria-labelledby="focal-length-heading">
      <h2 id="focal-length-heading">{t('title')}</h2>
      <figure>
        <h3>{t('histogramTitle')}</h3>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('histogramAria')}
          style={{ width: '100%', height: 220, display: 'block' }}
        />
        <figcaption className="sr-only">{t('caption', { min, max, peakCount: block.topPeaks.length })}</figcaption>
      </figure>

      <h3>{t('topPeaks')}</h3>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {block.topPeaks.map((p) => (
          <li key={p.mm}>{`${p.mm}mm · ${p.pctOfTotal.toFixed(1)}%`}</li>
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
