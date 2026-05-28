'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { SECTION_GROUPS, anchorIdFor, type SectionGroup } from './sections'
import styles from './SectionAnchorNav.module.css'
import type { SectionId } from './sections'

interface SectionAnchorNavProps {
  /** ID of the section currently in view (drives aria-current + active styling). */
  activeSection: SectionId | null
}

export function SectionAnchorNav({ activeSection }: SectionAnchorNavProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sectionNav')
  // Default: all groups open. Users can collapse individual groups.
  const [collapsed, setCollapsed] = useState<Record<SectionGroup, boolean>>({
    highlights: false, whatYouShoot: false, howYouCurate: false, exploreCompare: false, catalog: false,
  })

  return (
    <nav className={styles.nav} aria-label={t('ariaLabel')}>
      {SECTION_GROUPS.map(({ group, sections }) => {
        const isCollapsed = collapsed[group]
        return (
          <section key={group} className={styles.group}>
            <button
              type="button"
              className={styles.groupHeader}
              aria-expanded={!isCollapsed}
              onClick={() => setCollapsed((c) => ({ ...c, [group]: !c[group] }))}
            >
              {t(`group.${group}` as const)}
              <span aria-hidden="true" className={styles.groupCaret}>{isCollapsed ? '+' : '−'}</span>
            </button>
            {!isCollapsed && (
              <ul className={styles.groupList}>
                {sections.map((id) => {
                  const isActive = activeSection === id
                  return (
                    <li key={id}>
                      <a
                        href={`#${anchorIdFor(id)}`}
                        className={`${styles.anchorLink} ${isActive ? styles.anchorLinkActive : ''}`}
                        aria-current={isActive ? 'location' : undefined}
                      >
                        {t(`section.${id}` as const)}
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </nav>
  )
}
