import { Image, Text, View } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function EditIntensityPage({ blob, s, g, chart }: SectionPageProps) {
  const e = blob.editIntensity
  const t = s.editIntensity
  const tiles = [
    { label: t.tiles.exposure, value: `${e.avgExposureShiftStops.toFixed(2)} EV` },
    { label: t.tiles.crop, value: `${e.avgCropPct.toFixed(1)}%` },
    { label: t.tiles.local, value: `${e.pctWithLocalAdjustments.toFixed(0)}%` },
    { label: t.tiles.presets, value: `${e.pctWithPresets.toFixed(0)}%` },
  ]
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      <View style={pdfStyles.tileGrid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={pdfStyles.tileCell}>
            <Text style={pdfStyles.tileLabel}>{tile.label}</Text>
            <Text style={pdfStyles.tileValue}>{tile.value}</Text>
          </View>
        ))}
      </View>
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      {e.sampled && <Text style={pdfStyles.muted}>{t.sampledNote}</Text>}
    </PageFrame>
  )
}
