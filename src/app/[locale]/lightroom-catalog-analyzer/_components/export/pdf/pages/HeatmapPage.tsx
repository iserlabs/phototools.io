import { Image, Text } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function HeatmapPage({ blob, s, g, chart }: SectionPageProps) {
  const t = s.heatmap
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      <Text style={pdfStyles.body}>{t.yearsCovered}: {blob.heatmap.years.join(', ')}</Text>
      <Text style={pdfStyles.body}>{t.daysWithPhotos}: {blob.heatmap.byDay.length.toLocaleString('en-US')}</Text>
    </PageFrame>
  )
}
