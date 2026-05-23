import { Image, Text } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function FocalLengthPage({ blob, s, g, chart }: SectionPageProps) {
  const b = blob.focalLength
  const t = s.focalLength
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      <Text style={pdfStyles.body}>{t.histogramTitle}</Text>
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      <Text style={pdfStyles.body}>{t.topPeaks}: {b.topPeaks.map((p) => `${p.mm}mm (${p.pctOfTotal.toFixed(0)}%)`).join(' · ')}</Text>
      <Text style={pdfStyles.body}>
        {b.bestOnePrime
          ? t.onePrime.replace('{mm}', String(b.bestOnePrime.mm)).replace('{pct}', b.bestOnePrime.coveragePct.toFixed(0))
          : t.noPrime}
      </Text>
    </PageFrame>
  )
}
