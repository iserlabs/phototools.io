'use client'

import { useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { SECTION_GROUPS, anchorIdFor } from './sections'
import styles from './SectionAnchorNav.module.css'

export function MobileSectionDropdown() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sectionNav')
  const detailsRef = useRef<HTMLDetailsElement>(null)

  // Close the dropdown after the user picks a section.
  const onAnchorClick = useCallback(() => {
    const el = detailsRef.current
    if (el && el.open) el.open = false
  }, [])

  return (
    <details ref={detailsRef} className={styles.mobileDetails}>
      <summary className={styles.mobileSummary}>{t('jumpToSection')}</summary>
      <div className={styles.mobileDetailsBody}>
        {SECTION_GROUPS.map(({ group, sections }) => (
          <section key={group} className={styles.mobileGroup}>
            <h3 className={styles.mobileGroupHeader}>{t(`group.${group}` as const)}</h3>
            <ul className={styles.mobileGroupList}>
              {sections.map((id) => (
                <li key={id}>
                  <a
                    href={`#${anchorIdFor(id)}`}
                    className={styles.mobileAnchorLink}
                    onClick={onAnchorClick}
                  >
                    {t(`section.${id}` as const)}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  )
}
