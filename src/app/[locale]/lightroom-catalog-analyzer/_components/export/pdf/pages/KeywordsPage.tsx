import { Image, Text, View } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function KeywordsPage({ blob, s, g, chart }: SectionPageProps) {
  const k = blob.keywords
  const t = s.keywords
  const tiles = [
    { label: t.tiles.tagged, value: k.totalTaggedPhotos.toLocaleString('en-US') },
    { label: t.tiles.untagged, value: k.totalUntaggedPhotos.toLocaleString('en-US') },
    { label: t.tiles.unique, value: k.uniqueKeywordCount.toLocaleString('en-US') },
    { label: t.tiles.orphans, value: k.orphanKeywordCount.toLocaleString('en-US') },
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
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tr}>
          <Text style={[pdfStyles.th, pdfStyles.cellWide]}>{t.keywordHeader}</Text>
          <Text style={[pdfStyles.th, pdfStyles.cell]}>{t.photosHeader}</Text>
        </View>
        {k.topKeywords.map((kw) => (
          <View key={kw.keyword} style={pdfStyles.tr}>
            <Text style={[pdfStyles.td, pdfStyles.cellWide]}>{kw.keyword}</Text>
            <Text style={[pdfStyles.td, pdfStyles.cell]}>{kw.count.toLocaleString('en-US')}</Text>
          </View>
        ))}
      </View>
    </PageFrame>
  )
}
