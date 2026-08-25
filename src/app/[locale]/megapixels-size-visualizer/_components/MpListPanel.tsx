'use client'

import { useTranslations } from 'next-intl'
import { MP_PRESETS } from '@/lib/data/megapixelVisualizer'
import type { CustomMegapixel } from '@/lib/types'
import { HintTooltip } from '@/components/shared/HintTooltip'
import ss from './MegapixelVisualizer.module.css'

interface Props {
  visible: Set<string>
  customMps: CustomMegapixel[]
  onToggleMp: (id: string) => void
}

export function MpListPanel({ visible, customMps, onToggleMp }: Props) {
  const t = useTranslations('toolUI.megapixels-size-visualizer')
  const tooltipT = useTranslations('common.tooltip')

  return (
    <>
      <fieldset className={ss.controlGroup}>
        <legend className={ss.legend}>{t('megapixels')}</legend>
        <div className={ss.checkboxes}>
          {MP_PRESETS.map(p => (
            <label key={p.id} className={ss.checkLabel}>
              <input
                type="checkbox"
                checked={visible.has(p.id)}
                onChange={() => onToggleMp(p.id)}
                data-testid={`mp-toggle-${p.id}`}
              />
              <span className={ss.checkDot} style={{ backgroundColor: p.color }} />
              <span className={ss.checkName}>{p.name}</span>
              {p.models && (
                <HintTooltip
                  text={p.models}
                  label={tooltipT('infoLabel', { term: p.name })}
                  className={ss.modelTooltip}
                >
                  ?
                </HintTooltip>
              )}
              <span className={ss.checkOutline} />
            </label>
          ))}
        </div>
      </fieldset>

      {customMps.length > 0 && (
        <>
          <div className={ss.sectionLabel}>{t('customMegapixels')}</div>
          <div className={ss.checkboxes}>
            {customMps.map(c => (
              <label key={c.id} className={ss.checkLabel}>
                <input
                  type="checkbox"
                  checked={visible.has(c.id)}
                  onChange={() => onToggleMp(c.id)}
                  data-testid={`custom-mp-toggle-${c.id}`}
                />
                <span className={ss.checkDot} style={{ backgroundColor: c.color }} />
                <span className={ss.checkName}>
                  {c.name} ({c.mp} MP)
                </span>
                <span className={ss.checkOutline} />
              </label>
            ))}
          </div>
        </>
      )}
    </>
  )
}
