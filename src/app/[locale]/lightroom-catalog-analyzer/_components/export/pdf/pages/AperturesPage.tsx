import { Image, Text } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function AperturesPage({ blob, s, g, chart }: SectionPageProps) {
  const t = s.apertures
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      {blob.apertures.perLens.map((a) => (
        <Text key={a.lens} style={pdfStyles.body}>
          {t.perLens.replace('{lens}', a.lens).replace('{pct}', a.wideOpenPct.toFixed(0))}
        </Text>
      ))}
    </PageFrame>
  )
}
