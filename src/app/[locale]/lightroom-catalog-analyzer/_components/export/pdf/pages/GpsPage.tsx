import { Image, Text, View } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function GpsPage({ blob, s, g, chart }: SectionPageProps) {
  const t = s.gps
  const gps = blob.gps
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      <Text style={pdfStyles.body}>{t.coverage.replace('{pct}', gps.pctWithGps.toFixed(0))}</Text>
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tr}>
          <Text style={[pdfStyles.th, pdfStyles.cellWide]}>{t.regionHeader}</Text>
          <Text style={[pdfStyles.th, pdfStyles.cell]}>{t.photosHeader}</Text>
        </View>
        {gps.topRegions.map((r) => (
          <View key={r.region} style={pdfStyles.tr}>
            <Text style={[pdfStyles.td, pdfStyles.cellWide]}>{r.region}</Text>
            <Text style={[pdfStyles.td, pdfStyles.cell]}>{r.count.toLocaleString('en-US')}</Text>
          </View>
        ))}
      </View>
    </PageFrame>
  )
}
