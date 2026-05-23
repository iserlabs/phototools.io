import { Image, Text, View } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function RatingsPage({ blob, s, g, chart }: SectionPageProps) {
  const d = blob.ratings.distribution
  const t = s.ratings
  const rows: Array<[string, number]> = [
    ['Rejected', d.rejected], ['0★', d.r0], ['1★', d.r1], ['2★', d.r2], ['3★', d.r3], ['4★', d.r4], ['5★', d.r5],
  ]
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tr}>
          <Text style={[pdfStyles.th, pdfStyles.cellWide]}>{t.ratingHeader}</Text>
          <Text style={[pdfStyles.th, pdfStyles.cell]}>{t.photosHeader}</Text>
        </View>
        {rows.map(([rating, n]) => (
          <View key={rating} style={pdfStyles.tr}>
            <Text style={[pdfStyles.td, pdfStyles.cellWide]}>{rating}</Text>
            <Text style={[pdfStyles.td, pdfStyles.cell]}>{n.toLocaleString('en-US')}</Text>
          </View>
        ))}
      </View>
    </PageFrame>
  )
}
