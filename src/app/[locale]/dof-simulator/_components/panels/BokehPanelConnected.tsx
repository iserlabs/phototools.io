'use client'

import { useTranslations } from 'next-intl'
import { BokehPanel, type BokehLabels } from './BokehPanel'
import type { BokehShapeId } from '@/lib/data/dofSimulator/types'

interface BokehPanelConnectedProps {
  bokeh: BokehShapeId
  onChange(v: BokehShapeId): void
}

export function BokehPanelConnected({ bokeh, onChange }: BokehPanelConnectedProps) {
  const t = useTranslations('toolUI.dof-simulator')

  const labels: BokehLabels = {
    bokeh: t('bokeh'),
    shapeDisc: t('bokehShapeDisc'),
    shapeBlade5: t('bokehShapeBlade5'),
    shapeBlade6: t('bokehShapeBlade6'),
    shapeBlade7: t('bokehShapeBlade7'),
    shapeBlade8: t('bokehShapeBlade8'),
    shapeBlade9: t('bokehShapeBlade9'),
    shapeCata: t('bokehShapeCata'),
  }

  return <BokehPanel bokeh={bokeh} onChange={onChange} labels={labels} />
}
