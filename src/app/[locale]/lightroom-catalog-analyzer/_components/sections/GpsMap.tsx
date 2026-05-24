'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { COMPACT_LIST } from './sectionStyles'
import { drawGpsMap, type GeoFeatureCollection } from './GpsMap.canvas'

export function GpsMap() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.gps-map')
  const { insightBlob } = useAnalyzer()
  const gps = insightBlob?.gps ?? null
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [world, setWorld] = useState<GeoFeatureCollection | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/maps/world-low.geo.json')
      .then((r) => r.json())
      .then((data: GeoFeatureCollection) => {
        if (!cancelled) setWorld(data)
      })
      .catch(() => {
        /* canvas still draws clusters without outlines */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !gps) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    drawGpsMap(ctx, gps, world, { width: rect.width, height: rect.height })
  }, [gps, world])

  if (!gps || gps.totalPhotosWithGps === 0) {
    return (
      <section aria-labelledby="gps-heading">
        <h2 id="gps-heading">{t('title')}</h2>
        <p>{t('empty')}</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="gps-heading">
      <h2 id="gps-heading">{t('title')}</h2>
      <p>{t('coverage', { pct: gps.pctWithGps.toFixed(0), count: gps.totalPhotosWithGps.toLocaleString() })}</p>
      <figure>
        <canvas ref={canvasRef} role="img" aria-label={t('aria')} style={{ width: '100%', height: 360, display: 'block' }} />
        <figcaption className="sr-only">{t('caption', { clusters: gps.clusters.length })}</figcaption>
      </figure>

      <h3>{t('topRegions')}</h3>
      <ul style={COMPACT_LIST}>
        {gps.topRegions.map((r) => (
          <li key={r.region}>
            <span>{r.region}</span> — {r.count.toLocaleString()}
          </li>
        ))}
      </ul>
    </section>
  )
}
