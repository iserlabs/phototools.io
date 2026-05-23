import { Text, View } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function OverviewPage({ blob, s, g }: SectionPageProps) {
  const o = blob.overview
  const t = s.overview
  const tiles = [
    { label: t.tiles.totalPhotos, value: o.totalPhotos.toLocaleString('en-US') },
    { label: t.tiles.daysShot, value: String(o.daysShot) },
    { label: t.tiles.topBody, value: o.topBody ?? '—' },
    { label: t.tiles.topLens, value: o.topLens ?? '—' },
  ]
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      <View style={pdfStyles.tileGrid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={pdfStyles.tileCell}>
            <Text style={pdfStyles.tileLabel}>{tile.label}</Text>
            <Text style={pdfStyles.tileValue}>{tile.value}</Text>
          </View>
        ))}
      </View>
      <Text style={pdfStyles.body}>{o.dateRange.first} – {o.dateRange.last}</Text>
      <Text style={pdfStyles.body}>{o.bodyCount} bodies · {o.lensCount} lenses · {o.photosPerDay.toFixed(1)} / day</Text>
    </PageFrame>
  )
}
