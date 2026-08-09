'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ModeToggle } from '@/components/shared/ModeToggle'
import { SENSORS, POPULAR_MODELS } from '@/lib/data/sensors'
import type { ControlsPanelProps, ResolvedSensor } from './sensorSizeTypes'
import { CustomSensorForm } from './CustomSensorForm'
import { EditSensorRow } from './EditSensorRow'
import ss from './SensorSize.module.css'

export function SensorControlsPanel({
  visible, mode, customSensors,
  onToggleSensor, onModeChange, onAddCustom, onRemoveCustom, onRemoveAllCustom, onEditCustom,
}: ControlsPanelProps) {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const sensorsT = useTranslations('common.sensors')
  const [editingId, setEditingId] = useState<string | null>(null)
  return (
    <>
      <ModeToggle
        title={t('displayMode')}
        options={[
          { value: 'overlay', label: t('modeOverlay') },
          { value: 'side-by-side', label: t('modeSideBySide') },
          { value: 'pixel-density', label: t('modePixelDensity') },
        ]}
        value={mode}
        onChange={onModeChange}
      />

      {mode === 'pixel-density' && (
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          {t('pixelDensityDescription')}
        </p>
      )}

      <div className={ss.sectionLabel}>{t('sensors')}</div>
      <div className={ss.checkboxes}>
        {(SENSORS as ResolvedSensor[]).map((s) => {
          const models = POPULAR_MODELS[s.id]
          return (
            <label key={s.id} className={ss.checkLabel}>
              <input
                type="checkbox"
                checked={visible.has(s.id)}
                onChange={() => onToggleSensor(s.id)}
              />
              <span className={ss.checkDot} style={{ backgroundColor: s.color }} />
              <span className={ss.checkName}>{sensorsT.has(s.id) ? sensorsT(s.id) : s.name}</span>
              {models && models.length > 0 && (
                <span className={ss.modelTooltip} data-models={models.join(' · ')}>?</span>
              )}
              <span className={ss.checkOutline} />
            </label>
          )
        })}
      </div>

      <div className={ss.sectionLabel}>{t('customSensors')}</div>
      {customSensors.length > 0 && (
        <div className={ss.checkboxes}>
          {[...customSensors].sort((a, b) => (b.w * b.h) - (a.w * a.h)).map((s) => {
            if (editingId === s.id) {
              return (
                <EditSensorRow
                  key={s.id}
                  sensor={s}
                  onSave={(id, name, w, h, mp) => { onEditCustom(id, name, w, h, mp); setEditingId(null) }}
                  onCancel={() => setEditingId(null)}
                />
              )
            }
            return (
              <label key={s.id} className={ss.checkLabel}>
                <input
                  type="checkbox"
                  checked={visible.has(s.id)}
                  onChange={() => onToggleSensor(s.id)}
                />
                <span className={ss.checkDot} style={{ backgroundColor: s.color }} />
                <span className={ss.checkName}>{s.name}</span>
                <button
                  className={ss.customEditBtn}
                  onClick={(e) => { e.preventDefault(); setEditingId(s.id) }}
                  title={t('edit')}
                >
                  ✎
                </button>
                <button
                  className={ss.customRemoveBtn}
                  onClick={(e) => { e.preventDefault(); onRemoveCustom(s.id) }}
                  title={t('remove')}
                >
                  ✕
                </button>
                <span className={ss.checkOutline} />
              </label>
            )
          })}
        </div>
      )}
      <CustomSensorForm onAdd={onAddCustom} />
      {customSensors.length > 0 && (
        <button className={ss.deleteAllBtn} onClick={onRemoveAllCustom}>
          {t('deleteAllCustom')}
        </button>
      )}
    </>
  )
}
