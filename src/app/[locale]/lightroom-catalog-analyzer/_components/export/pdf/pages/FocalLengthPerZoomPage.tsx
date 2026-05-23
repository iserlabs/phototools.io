import { Image, Text } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function FocalLengthPerZoomPage({ blob, s, g, chart }: SectionPageProps) {
  const t = s.focalLengthPerZoom
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      {blob.focalLengthPerZoom.zooms.map((z) => (
        <Text key={z.lens} style={pdfStyles.body}>
          {t.perLens.replace('{lens}', z.lens).replace('{pct}', z.topMmPct.toFixed(0)).replace('{mm}', String(z.topMm))}
        </Text>
      ))}
    </PageFrame>
  )
}
