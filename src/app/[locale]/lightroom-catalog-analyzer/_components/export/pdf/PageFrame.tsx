import { Page, Text, View } from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import { pdfStyles } from './theme'

/** A4 portrait page with the standard fixed footer (brand + page number). */
export function PageFrame({ children, generatedBy, pageLabel }: { children: ReactNode; generatedBy: string; pageLabel: string }) {
  return (
    <Page size="A4" style={pdfStyles.page}>
      {children}
      <View style={pdfStyles.footer} fixed>
        <Text>{generatedBy}</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageLabel} ${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  )
}
