'use client'

import { useTranslations } from 'next-intl'
import type { TemplateConfig } from './types'
import { TEMPLATES } from './templateData'
import styles from './TemplatePanel.module.css'

interface TemplatePanelProps {
  config: TemplateConfig
  onChange: (config: TemplateConfig) => void
}

export function TemplatePanel({ config, onChange }: TemplatePanelProps) {
  const t = useTranslations('toolUI.frame-studio')

  return (
    <div className={styles.panel}>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>{t('templateSelect')}</label>
        <select
          className={styles.select}
          value={config.templateId ?? ''}
          onChange={(e) =>
            onChange({ ...config, templateId: e.target.value || null })
          }
        >
          <option value="">{t('templateNone')}</option>
          {TEMPLATES.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>
              {t(tmpl.nameKey)} ({tmpl.aspectLabel})
            </option>
          ))}
        </select>
      </div>

      {config.templateId && (
        <>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('templateTitle')}</label>
            <input
              className={styles.input}
              type="text"
              value={config.title}
              onChange={(e) => onChange({ ...config, title: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('templateSubtitle')}</label>
            <input
              className={styles.input}
              type="text"
              value={config.subtitle}
              onChange={(e) => onChange({ ...config, subtitle: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('textColor')}</label>
            <input
              type="color"
              className={styles.colorPicker}
              value={config.textColor}
              onChange={(e) =>
                onChange({ ...config, textColor: e.target.value })
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
