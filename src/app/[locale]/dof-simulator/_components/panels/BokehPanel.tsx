'use client'

import { ControlPanel, controlPanelStyles as cp } from '@/components/shared/ControlPanel'
import { BOKEH_SHAPE_IDS } from '@/lib/data/dofSimulator/bokeh'
import type { BokehShapeId } from '@/lib/data/dofSimulator/types'

// Presentational — see FramingPanel.tsx / AppearancePanel.tsx for the
// labels-prop pattern this follows (default English literals, translated by
// BokehPanelConnected). Keeps this component (and any fixed test that
// renders it with no NextIntlClientProvider) provider-free.
export interface BokehLabels {
  bokeh: string
  shapeDisc: string
  shapeBlade5: string
  shapeBlade6: string
  shapeBlade7: string
  shapeBlade8: string
  shapeBlade9: string
  shapeCata: string
}

const DEFAULT_LABELS: BokehLabels = {
  bokeh: 'Bokeh',
  shapeDisc: 'Circular',
  shapeBlade5: '5 Blades',
  shapeBlade6: '6 Blades',
  shapeBlade7: '7 Blades',
  shapeBlade8: '8 Blades',
  shapeBlade9: '9 Blades',
  shapeCata: 'Catadioptric',
}

const SHAPE_LABEL_KEYS: Record<BokehShapeId, keyof BokehLabels> = {
  disc: 'shapeDisc',
  blade5: 'shapeBlade5',
  blade6: 'shapeBlade6',
  blade7: 'shapeBlade7',
  blade8: 'shapeBlade8',
  blade9: 'shapeBlade9',
  cata: 'shapeCata',
}

interface BokehPanelProps {
  bokeh: BokehShapeId
  onChange(v: BokehShapeId): void
  labels?: BokehLabels
}

/** Selects the WebGL bokeh blade shape — drives the background-blur
 *  shader (useRenderer), BokehInset's corner preview, ResultsPanel's glyph,
 *  and the shareable `?bokeh=` URL param. Previously only settable via that
 *  URL param; this is its only UI control. */
export function BokehPanel({ bokeh, onChange, labels = DEFAULT_LABELS }: BokehPanelProps) {
  return (
    <ControlPanel title={labels.bokeh}>
      <select
        className={cp.select}
        value={bokeh}
        onChange={(e) => onChange(e.target.value as BokehShapeId)}
        aria-label={labels.bokeh}
      >
        {BOKEH_SHAPE_IDS.map((id) => (
          <option key={id} value={id}>{labels[SHAPE_LABEL_KEYS[id]]}</option>
        ))}
      </select>
    </ControlPanel>
  )
}
