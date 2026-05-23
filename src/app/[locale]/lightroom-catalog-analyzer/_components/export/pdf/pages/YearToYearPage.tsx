import { Text, View } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function YearToYearPage({ blob, s, g }: SectionPageProps) {
  const b = blob.yearToYear
  const t = s.yearToYear
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      {b && b.years.length >= 2 ? (
        <>
          {b.biggestShift && (
            <Text style={pdfStyles.body}>
              {t.biggestShift.replace('{label}', b.biggestShift.statKey).replace('{year}', String(b.biggestShift.year)).replace('{delta}', b.biggestShift.deltaText)}
            </Text>
          )}
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tr}>
              <Text style={[pdfStyles.th, pdfStyles.cellWide]}>{t.stat}</Text>
              {b.years.map((y) => <Text key={y} style={[pdfStyles.th, pdfStyles.cell]}>{y}</Text>)}
            </View>
            {b.rows.map((row) => (
              <View key={row.statKey} style={pdfStyles.tr}>
                <Text style={[pdfStyles.td, pdfStyles.cellWide]}>{row.label}</Text>
                {row.values.map((v, i) => (
                  <Text key={`${row.statKey}-${i}`} style={[pdfStyles.td, pdfStyles.cell]}>
                    {typeof v === 'number' ? v.toLocaleString('en-US') : v}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </>
      ) : <Text style={pdfStyles.muted}>—</Text>}
    </PageFrame>
  )
}
