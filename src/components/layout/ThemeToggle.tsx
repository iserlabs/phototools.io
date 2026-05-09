'use client'

import { useTranslations } from 'next-intl'
import { trackThemeToggle } from '@/lib/analytics'
import styles from './ThemeToggle.module.css'

interface ThemeToggleProps {
  theme: string
  onChange: (theme: 'dark' | 'light') => void
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const t = useTranslations('common.theme')
  const label = theme === 'dark' ? t('switchToLight') : t('switchToDark')

  return (
    <button
      type="button"
      onClick={() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        trackThemeToggle({ new_theme: newTheme })
        onChange(newTheme)
      }}
      title={label}
      aria-label={label}
      className={styles.toggle}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
    </button>
  )
}
