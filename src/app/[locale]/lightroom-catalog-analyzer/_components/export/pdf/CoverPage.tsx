import { Page, Text, View } from '@react-pdf/renderer'
import type { InsightBlob } from '@/lib/lrcat/types'
import { pdfStyles } from './theme'
import type { PdfStrings } from './PdfDocument'

export function CoverPage({ blob, strings, filtered }: { blob: InsightBlob; strings: PdfStrings; filtered: boolean }) {
  const m = blob.meta
  return (
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.h1}>{strings.title}{filtered ? strings.filteredSuffix : ''}</Text>
      <View style={pdfStyles.coverRule} />
      <View style={pdfStyles.coverMeta}>
        <Text style={pdfStyles.body}>{strings.totalPhotos}: {m.totalPhotos.toLocaleString('en-US')}</Text>
        <Text style={pdfStyles.body}>{strings.dateRange}: {m.dateRange.first} – {m.dateRange.last}</Text>
        <Text style={pdfStyles.body}>{strings.catalogVersion}: Lightroom Classic v{m.catalogVersion}</Text>
      </View>
      <View style={pdfStyles.footer} fixed>
        <Text>{strings.generatedBy}</Text>
        <Text>{strings.localFooter}</Text>
      </View>
    </Page>
  )
}
