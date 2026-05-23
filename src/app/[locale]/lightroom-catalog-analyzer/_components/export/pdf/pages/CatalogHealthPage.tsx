import { Text, View } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function CatalogHealthPage({ blob, s, g }: SectionPageProps) {
  const h = blob.catalogHealth
  const t = s.catalogHealth
  const tiles = [
    { label: t.tiles.missing, value: h.missingOriginals.toLocaleString('en-US') },
    { label: t.tiles.previews, value: h.missingPreviews.toLocaleString('en-US') },
    { label: t.tiles.broken, value: h.brokenPaths.toLocaleString('en-US') },
    { label: t.tiles.dupes, value: h.likelyDuplicates.toLocaleString('en-US') },
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
      <Text style={pdfStyles.muted}>{t.actionNote}</Text>
    </PageFrame>
  )
}
