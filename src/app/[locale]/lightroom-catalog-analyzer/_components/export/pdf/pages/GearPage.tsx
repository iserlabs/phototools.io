import { Image, Text, View } from '@react-pdf/renderer'
import type { InsightBlob } from '@/lib/lrcat/types'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { PdfStrings } from '../PdfDocument'
import type { SectionStrings } from './types'

export function GearPage({ blob, s, g, bodiesChart, lensesChart }: {
  blob: InsightBlob; s: SectionStrings; g: PdfStrings; bodiesChart?: string; lensesChart?: string
}) {
  const t = s.gear
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      {bodiesChart && (<><Text style={pdfStyles.body}>{t.bodiesOverTime}</Text><Image style={pdfStyles.chart} src={bodiesChart} /></>)}
      {lensesChart && (<><Text style={pdfStyles.body}>{t.topLenses}</Text><Image style={pdfStyles.chart} src={lensesChart} /></>)}
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tr}>
          <Text style={[pdfStyles.th, pdfStyles.cellWide]}>{t.lensHeader}</Text>
          <Text style={[pdfStyles.th, pdfStyles.cell]}>{t.photosHeader}</Text>
        </View>
        {blob.gear.topLenses.map((l) => (
          <View key={l.lens} style={pdfStyles.tr}>
            <Text style={[pdfStyles.td, pdfStyles.cellWide]}>{l.lens}</Text>
            <Text style={[pdfStyles.td, pdfStyles.cell]}>{l.count.toLocaleString('en-US')}</Text>
          </View>
        ))}
      </View>
      {blob.gear.retired.length > 0 && (
        <Text style={pdfStyles.body}>{t.retired}: {blob.gear.retired.map((r) => `${r.name} (${r.lastUsed.slice(0, 7)})`).join(', ')}</Text>
      )}
    </PageFrame>
  )
}
