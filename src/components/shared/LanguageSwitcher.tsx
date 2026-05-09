'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/lib/i18n/navigation'
import { locales, localeNames, localeFlags } from '@/lib/i18n/routing'
import type { Locale } from '@/lib/i18n/routing'
import { trackLanguageSwitch } from '@/lib/analytics'
import styles from './LanguageSwitcher.module.css'

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('common.language')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const sortedLocales = [...locales].sort((a, b) => localeNames[a].localeCompare(localeNames[b]))
  const COLUMNS = 3
  const rowsPerColumn = Math.ceil(sortedLocales.length / COLUMNS)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function switchLocale(newLocale: Locale) {
    trackLanguageSwitch({ from_locale: locale, to_locale: newLocale })
    router.replace(pathname, { locale: newLocale })
    setOpen(false)
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('change')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className={styles.code}>{locale.toUpperCase()}</span>
      </button>
      {open && (
        <ul
          className={styles.dropdown}
          role="listbox"
          aria-label={t('select')}
          style={{ gridTemplateRows: `repeat(${rowsPerColumn}, 36px)` }}
        >
          {sortedLocales.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button
                className={`${styles.option} ${l === locale ? styles.optionActive : ''}`}
                onClick={() => switchLocale(l)}
              >
                <span className={styles.flag} aria-hidden="true">{localeFlags[l]}</span>
                <span className={styles.name}>{localeNames[l]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
