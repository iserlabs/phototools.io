import type { AnalysisFilter, InsightBlob } from '@/lib/lrcat/types'
import { fmtAperture } from '../sections/sectionFormatters'

const BRAND = 'phototools.io/lightroom-catalog-analyzer'

function num(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString('en-US')
}

function table(headers: string[], rows: Array<Array<string | number>>): string {
  const head = `| ${headers.join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.map((c) => (typeof c === 'number' ? c.toLocaleString('en-US') : c)).join(' | ')} |`)
  return [head, sep, ...body].join('\n')
}

function filterBlock(f: AnalysisFilter): string {
  const lines: string[] = ['## Filter applied', '']
  if (f.dateRange) lines.push(`- Date range: ${f.dateRange.start} – ${f.dateRange.end}`)
  if (f.cameras?.length) lines.push(`- Cameras: ${f.cameras.join(', ')}`)
  if (f.lenses?.length) lines.push(`- Lenses: ${f.lenses.join(', ')}`)
  if (f.focalLengthRange) lines.push(`- Focal length: ${f.focalLengthRange[0]}–${f.focalLengthRange[1]}mm`)
  if (f.apertureRange) lines.push(`- Aperture: f/${f.apertureRange[0]}–f/${f.apertureRange[1]}`)
  if (f.isoRange) lines.push(`- ISO: ${f.isoRange[0]}–${f.isoRange[1]}`)
  if (f.ratings?.length) lines.push(`- Ratings: ${f.ratings.join(', ')}`)
  if (f.keywords?.length) lines.push(`- Keywords: ${f.keywords.join(', ')}`)
  if (f.picks) lines.push(`- Pick state: ${f.picks}`)
  return lines.join('\n')
}

export function markdownReport(blob: InsightBlob): string {
  const out: string[] = []
  const m = blob.meta

  out.push('# Lightroom Catalog Analysis')
  out.push('')
  out.push(`- Total photos: ${num(m.totalPhotos)}`)
  out.push(`- Date range: ${m.dateRange.first} – ${m.dateRange.last}`)
  out.push(`- Catalog version: Lightroom Classic v${m.catalogVersion}`)
  out.push('')

  if (blob.filterContext) {
    out.push(filterBlock(blob.filterContext))
    out.push('')
  }

  const yir = blob.yearInReview
  out.push('## Year in Review')
  out.push('')
  if (yir) {
    out.push(`- Year: ${yir.year}`)
    out.push(`- Total photos: ${num(yir.totalPhotos)}`)
    out.push(`- Days shot: ${num(yir.daysShot)}`)
    out.push(`- Most-used body: ${yir.topBody ?? '—'}`)
    out.push(`- Most-used lens: ${yir.topLens ?? '—'}`)
    out.push(`- Top focal length: ${yir.topFocalLengthMm != null ? `${yir.topFocalLengthMm}mm` : '—'}`)
    out.push(`- Top aperture: ${yir.topApertureFNumber != null ? fmtAperture(yir.topApertureFNumber) : '—'}`)
    out.push(`- Most prolific month: ${yir.mostProlificMonth ? `${yir.mostProlificMonth.month} (${num(yir.mostProlificMonth.count)})` : '—'}`)
    out.push(`- Avg shots / day: ${yir.avgShotsPerDay.toFixed(1)}`)
  } else {
    out.push('_No year-in-review data._')
  }
  out.push('')

  const y2y = blob.yearToYear
  out.push('## Year-to-Year')
  out.push('')
  if (y2y && y2y.years.length >= 2) {
    if (y2y.biggestShift) out.push(`Biggest shift: ${y2y.biggestShift.statKey} in ${y2y.biggestShift.year} (${y2y.biggestShift.deltaText}).`, '')
    out.push(table(['Stat', ...y2y.years.map(String)], y2y.rows.map((r) => [r.label, ...r.values])))
  } else {
    out.push('_Need at least 2 full years for year-to-year comparison._')
  }
  out.push('')

  const o = blob.overview
  out.push('## Overview', '')
  out.push(`- Total photos: ${num(o.totalPhotos)}`)
  out.push(`- Days shot: ${num(o.daysShot)}`)
  out.push(`- Photos / day: ${o.photosPerDay.toFixed(1)}`)
  out.push(`- Bodies: ${num(o.bodyCount)} · Lenses: ${num(o.lensCount)}`)
  out.push(`- Top body: ${o.topBody ?? '—'} · Top lens: ${o.topLens ?? '—'}`)
  out.push(`- Top focal length: ${o.topFocalLengthMm != null ? `${o.topFocalLengthMm}mm` : '—'}`)
  out.push('')

  out.push('## Gear', '')
  out.push(table(['Lens', 'Photos'], blob.gear.topLenses.map((l) => [l.lens, l.count])))
  if (blob.gear.retired.length) out.push('', `Retired: ${blob.gear.retired.map((r) => `${r.name} (${r.lastUsed.slice(0, 7)})`).join(', ')}`)
  out.push('')

  const fl = blob.focalLength
  out.push('## Focal Length', '')
  out.push(table(['Focal length', '% of shots'], fl.topPeaks.map((p) => [`${p.mm}mm`, `${p.pctOfTotal.toFixed(1)}%`])))
  out.push('', fl.bestOnePrime
    ? `A ${fl.bestOnePrime.mm}mm prime would cover ${fl.bestOnePrime.coveragePct.toFixed(0)}% of your shots within ±25%.`
    : 'Your focal-length use is too spread out for a single prime to dominate.')
  out.push('')

  out.push('## Focal Length per Zoom', '')
  for (const z of blob.focalLengthPerZoom.zooms) out.push(`- ${z.lens}: ${z.topMmPct.toFixed(0)}% of shots at ${z.topMm}mm`)
  out.push('')

  out.push('## Aperture Sweet Spot', '')
  for (const a of blob.apertures.perLens) out.push(`- ${a.lens}: shot wide open ${a.wideOpenPct.toFixed(0)}% of the time`)
  out.push('')

  const tod = blob.timeOfDay
  out.push('## Time of Day', '')
  out.push(`- GPS-located photos (sun-angle basis): ${num(tod.bySunAngle.gpsPhotosCount)}`)
  out.push(`- Golden hour: ${num(tod.bySunAngle.goldenHour)} · Blue hour: ${num(tod.bySunAngle.blueHour)} · Midday: ${num(tod.bySunAngle.midday)} · Night: ${num(tod.bySunAngle.night)}`)
  out.push('')

  out.push('## Shooting Heatmap', '')
  out.push(`- Years covered: ${blob.heatmap.years.join(', ')}`)
  out.push(`- Days with photos: ${num(blob.heatmap.byDay.length)}`)
  out.push('')

  const gps = blob.gps
  out.push('## GPS Locations', '')
  out.push(`- % of catalog with GPS: ${gps.pctWithGps.toFixed(0)}% (${num(gps.totalPhotosWithGps)} photos)`)
  if (gps.topRegions.length) out.push('', table(['Region', 'Photos'], gps.topRegions.map((r) => [r.region, r.count])))
  out.push('')

  const c = blob.curation
  out.push('## Curation Funnel', '')
  out.push(table(['Stage', 'Photos'], [
    ['Total', c.funnel.total], ['Not rejected', c.funnel.notRejected],
    ['Rated ≥1★', c.funnel.rated1Plus], ['Rated ≥4★', c.funnel.rated4Plus],
  ]))
  out.push('')

  const ei = blob.editIntensity
  out.push('## Edit Intensity', '')
  out.push(`- Avg exposure shift: ${ei.avgExposureShiftStops.toFixed(2)} stops`)
  out.push(`- Avg crop: ${ei.avgCropPct.toFixed(1)}%`)
  out.push(`- With local adjustments: ${ei.pctWithLocalAdjustments.toFixed(0)}% · With presets: ${ei.pctWithPresets.toFixed(0)}%`)
  if (ei.sampled) out.push(`- _Estimate based on a sample of ${num(ei.sampleSize)} photos._`)
  out.push('')

  const r = blob.ratings
  out.push('## Ratings & Picks', '')
  out.push(table(['Rating', 'Photos'], [
    ['Rejected', r.distribution.rejected], ['0★', r.distribution.r0], ['1★', r.distribution.r1],
    ['2★', r.distribution.r2], ['3★', r.distribution.r3], ['4★', r.distribution.r4], ['5★', r.distribution.r5],
  ]))
  out.push('')

  const k = blob.keywords
  out.push('## Keyword Coverage', '')
  out.push(`- Tagged: ${num(k.totalTaggedPhotos)} · Untagged: ${num(k.totalUntaggedPhotos)}`)
  out.push(`- Unique keywords: ${num(k.uniqueKeywordCount)} · Avg / tagged photo: ${k.avgKeywordsPerTaggedPhoto.toFixed(1)} · Orphans: ${num(k.orphanKeywordCount)}`)
  if (k.topKeywords.length) out.push('', table(['Keyword', 'Photos'], k.topKeywords.map((kw) => [kw.keyword, kw.count])))
  out.push('')

  const b = blob.bursts
  out.push('## Burst Detection', '')
  out.push(`- Total bursts: ${num(b.totalBursts)} · Photos in bursts: ${num(b.totalPhotosInBursts)} (${b.pctInBursts.toFixed(0)}%)`)
  out.push(`- Longest burst: ${num(b.longestBurst)}`)
  out.push(`- Keeper rate in bursts: ${b.keeperRatePct.toFixed(0)}% vs ${b.singleShotKeeperRatePct.toFixed(0)}% for single shots`)
  out.push('')

  out.push('## Period Comparison', '')
  out.push('_Period Comparison is interactive in the app and is not exported._')
  out.push('')

  const h = blob.catalogHealth
  out.push('## Catalog Health', '')
  out.push(`- Missing originals: ${num(h.missingOriginals)} · Missing previews: ${num(h.missingPreviews)}`)
  out.push(`- Broken paths: ${num(h.brokenPaths)} · Likely duplicates: ${num(h.likelyDuplicates)}`)
  out.push('')

  out.push('---')
  out.push(`Generated by ${BRAND}. Your catalog was never uploaded — only these aggregated stats.`)

  return out.join('\n')
}
