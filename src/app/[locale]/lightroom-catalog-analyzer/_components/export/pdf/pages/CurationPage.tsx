import { Image, Text, View } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function CurationPage({ blob, s, g, chart }: SectionPageProps) {
  const t = s.curation
  const f = blob.curation.funnel
  const rows: Array<[string, number]> = [
    ['Total', f.total], ['Not rejected', f.notRejected], ['Rated ≥1★', f.rated1Plus], ['Rated ≥4★', f.rated4Plus],
  ]
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tr}>
          <Text style={[pdfStyles.th, pdfStyles.cellWide]}>{t.stageHeader}</Text>
          <Text style={[pdfStyles.th, pdfStyles.cell]}>{t.photosHeader}</Text>
        </View>
        {rows.map(([stage, n]) => (
          <View key={stage} style={pdfStyles.tr}>
            <Text style={[pdfStyles.td, pdfStyles.cellWide]}>{stage}</Text>
            <Text style={[pdfStyles.td, pdfStyles.cell]}>{n.toLocaleString('en-US')}</Text>
          </View>
        ))}
      </View>
    </PageFrame>
  )
}
