import { Text } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { PdfStrings } from '../PdfDocument'
import type { SectionStrings } from './types'

export function PeriodComparisonPage({ s, g }: { s: SectionStrings; g: PdfStrings }) {
  const t = s.periodComparison
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      <Text style={pdfStyles.muted}>{t.notExported}</Text>
    </PageFrame>
  )
}
