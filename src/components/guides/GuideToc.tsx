'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { TocEntry } from '@/lib/guides/types'
import styles from './GuideToc.module.css'

interface GuideTocProps {
  entries: TocEntry[]
}

export function GuideToc({ entries }: GuideTocProps) {
  const t = useTranslations('guides')
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (entries.length < 2) return
    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed.filter((e) => e.isIntersecting)
        if (visible.length > 0) setActiveId(visible[0].target.id)
      },
      { rootMargin: '0px 0px -70% 0px' }
    )
    for (const entry of entries) {
      const el = document.getElementById(entry.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [entries])

  if (entries.length < 2) return null

  return (
    <nav className={styles.toc} aria-label={t('onThisPage')}>
      <span className={styles.heading}>{t('onThisPage')}</span>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={[
                styles.link,
                entry.depth === 3 ? styles.depth3 : '',
                activeId === entry.id ? styles.active : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth' })
                history.replaceState(null, '', `#${entry.id}`)
              }}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
