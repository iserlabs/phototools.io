'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { POPULAR_MODELS } from '@/lib/data/sensors'
import type { SensorGroupId } from '@/lib/types'
import type { ResolvedSensor } from './sensorSizeTypes'
import { HintTooltip } from '@/components/shared/HintTooltip'
import ss from './SensorSize.module.css'

// Rarely-used formats stay tucked away on first load; every other group
// starts open so the common cases (medium format through phone) are visible
// without an extra tap.
const COLLAPSED_BY_DEFAULT: SensorGroupId[] = ['film', 'cine']

type SensorGroupSectionProps = {
  group: SensorGroupId
  sensors: ResolvedSensor[]
  visible: Set<string>
  onToggleSensor: (id: string) => void
  onHoverSensor: (id: string | null) => void
  forceOpen: boolean
}

export function SensorGroupSection({
  group, sensors, visible, onToggleSensor, onHoverSensor, forceOpen,
}: SensorGroupSectionProps) {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const sensorsT = useTranslations('common.sensors')
  const tooltipT = useTranslations('common.tooltip')
  const [open, setOpen] = useState(() => !COLLAPSED_BY_DEFAULT.includes(group))

  // Auto-expand a collapsed group the moment the current selection touches
  // it (e.g. arriving via a preset or a shared URL) — but never auto-collapse,
  // so a manual toggle by the user always wins afterward.
  useEffect(() => {
    if (forceOpen) setOpen(true)
  }, [forceOpen])

  const selectedCount = sensors.filter((s) => visible.has(s.id)).length

  return (
    <div className={ss.group}>
      <button
        type="button"
        className={ss.groupHeader}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={ss.groupChevron} data-open={open} aria-hidden="true">▸</span>
        <span className={ss.groupName}>{t(`groups.${group}`)}</span>
        <span className={ss.groupCount}>{selectedCount}/{sensors.length}</span>
      </button>
      {open && (
        <div className={ss.checkboxes}>
          {sensors.map((s) => {
            const models = POPULAR_MODELS[s.id]
            const name = sensorsT.has(s.id) ? sensorsT(s.id) : s.name
            return (
              <label
                key={s.id}
                className={ss.checkLabel}
                onMouseEnter={() => onHoverSensor(s.id)}
                onMouseLeave={() => onHoverSensor(null)}
              >
                <input
                  type="checkbox"
                  checked={visible.has(s.id)}
                  onChange={() => onToggleSensor(s.id)}
                />
                <span className={ss.checkDot} style={{ backgroundColor: s.color }} />
                <span className={ss.checkName}>{name}</span>
                {models && models.length > 0 && (
                  <HintTooltip
                    text={models.join(' · ')}
                    label={tooltipT('infoLabel', { term: name })}
                    className={ss.modelTooltip}
                  >
                    ?
                  </HintTooltip>
                )}
                <span className={ss.checkOutline} />
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
