'use client'

import { useTranslations } from 'next-intl'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { CALLOUT, DISCLAIMER, TILE, TILE_GRID, TILE_LABEL, TILE_VALUE, TABLE } from './sectionStyles'

export function CatalogHealth() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.catalog-health')
  const { insightBlob } = useAnalyzer()
  if (!insightBlob) return null
  const h = insightBlob.catalogHealth

  const tiles = [
    { label: t('tiles.missingOriginals'), value: h.missingOriginals.toLocaleString() },
    { label: t('tiles.missingPreviews'), value: h.missingPreviews.toLocaleString() },
    { label: t('tiles.brokenPaths'), value: h.brokenPaths.toLocaleString() },
    { label: t('tiles.likelyDuplicates'), value: h.likelyDuplicates.toLocaleString() },
  ]

  return (
    <section aria-labelledby="catalog-health-heading">
      <h2 id="catalog-health-heading">{t('title')}</h2>

      <figure>
        <dl style={TILE_GRID}>
          {tiles.map((tile) => (
            <div key={tile.label} style={TILE}>
              <dt style={TILE_LABEL}>{tile.label}</dt>
              <dd style={TILE_VALUE}>{tile.value}</dd>
            </div>
          ))}
        </dl>
        <figcaption className="sr-only">
          {t('caption', { missing: h.missingOriginals, duplicates: h.likelyDuplicates })}
        </figcaption>
      </figure>

      <h3>{t('duplicatesTable')}</h3>
      <p style={DISCLAIMER}>{t('duplicatesDisclaimer')}</p>
      <table style={TABLE}>
        <thead>
          <tr>
            <th scope="col">{t('duplicatesHeaders.captureTime')}</th>
            <th scope="col">{t('duplicatesHeaders.size')}</th>
            <th scope="col">{t('duplicatesHeaders.firstPath')}</th>
            <th scope="col">{t('duplicatesHeaders.lastPath')}</th>
          </tr>
        </thead>
        <tbody>
          {h.duplicateClusters.map((d, i) => (
            <tr key={`${d.captureTime}-${i}`}>
              <td>{d.captureTime}</td>
              <td>{d.size}</td>
              <td>{d.firstPath}</td>
              <td>{d.lastPath}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{t('missingByRootFolder')}</h3>
      <table style={TABLE}>
        <thead>
          <tr>
            <th scope="col">{t('missingHeaders.folder')}</th>
            <th scope="col">{t('missingHeaders.count')}</th>
          </tr>
        </thead>
        <tbody>
          {h.missingByRootFolder.map((row) => (
            <tr key={row.folder}>
              <td>{row.folder}</td>
              <td>{row.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={CALLOUT}>{t('actionNote')}</p>
    </section>
  )
}
