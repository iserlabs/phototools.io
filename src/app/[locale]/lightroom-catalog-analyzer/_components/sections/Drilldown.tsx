'use client'

import { useTranslations } from 'next-intl'

export function Drilldown() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.drilldown')
  return (
    <section aria-labelledby="drilldown-heading" id="drilldown">
      <h2 id="drilldown-heading">{t('title')}</h2>
      <p>{t('stub')}</p>
    </section>
  )
}
