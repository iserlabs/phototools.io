'use client'

import { useState, useRef, useEffect } from 'react'
import { Link, usePathname } from '@/lib/i18n/navigation'
import { useTranslations } from 'next-intl'
import { getLiveTools } from '@/lib/data/tools'
import type { ToolCategory } from '@/lib/types'
import { ToolIcon } from '@/components/shared/ToolIcon'
import { ApertureLogo } from '@/components/shared/ApertureLogo'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { trackNavClick, trackMobileMenuToggle } from '@/lib/analytics'
import styles from './Nav.module.css'

interface NavProps {
  theme: string
  onThemeChange: (theme: 'dark' | 'light') => void
}

function useCategoryLabels(): Record<ToolCategory, string> {
  const t = useTranslations('common.nav.categories')
  return {
    visualizer: t('visualizer'),
    calculator: t('calculator'),
    reference: t('reference'),
    'file-tool': t('file-tool'),
  }
}

const CATEGORY_ORDER: ToolCategory[] = ['file-tool', 'visualizer', 'calculator', 'reference']

function useCanHover() {
  const [canHover, setCanHover] = useState(false)
  useEffect(() => {
    setCanHover(window.matchMedia('(hover: hover)').matches)
  }, [])
  return canHover
}

export function Nav({ theme, onThemeChange }: NavProps) {
  const t = useTranslations('common.nav')
  const toolsT = useTranslations('tools')
  const CATEGORY_LABELS = useCategoryLabels()
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement>(null)
  const canHover = useCanHover()
  const pathname = usePathname()
  const tools = getLiveTools()

  const MAX_PER_COLUMN = 5

  const grouped = CATEGORY_ORDER.flatMap((cat) => {
    const catTools = tools.filter((t) => t.category === cat)
    if (catTools.length === 0) return []
    if (catTools.length <= MAX_PER_COLUMN) {
      return [{ category: cat, label: CATEGORY_LABELS[cat], tools: catTools }]
    }
    const mid = Math.ceil(catTools.length / 2)
    return [
      { category: `${cat}-1` as ToolCategory, label: CATEGORY_LABELS[cat], tools: catTools.slice(0, mid) },
      { category: `${cat}-2` as ToolCategory, label: '', tools: catTools.slice(mid) },
    ]
  })

  // Close menu on route change (covers all navigation, including mobile)
  useEffect(() => {
    setToolsOpen(false)
  }, [pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setToolsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.logo}>
          <ApertureLogo size={15} className={styles.logoIcon} />
          <span>Photo<span className={styles.logoAccent}>Tools</span></span>
        </Link>
        <div
          className={styles.dropdownWrapper}
          ref={toolsRef}
          onMouseEnter={canHover ? () => setToolsOpen(true) : undefined}
          onMouseLeave={canHover ? () => setToolsOpen(false) : undefined}
        >
          <button
            className={`${styles.dropdownButton} ${toolsOpen ? styles.dropdownButtonActive : ''}`}
            onClick={() => {
              const next = !toolsOpen
              setToolsOpen(next)
              trackMobileMenuToggle({ action: next ? 'open' : 'close' })
            }}
            aria-expanded={toolsOpen}
            aria-haspopup="true"
          >
            {t('tools')} {toolsOpen ? '\u25B2' : '\u25BC'}
          </button>
          {toolsOpen && (
            <div
              className={`${styles.megaMenu} ${styles.megaMenuOpen} ${styles.megaMenuAnimated}`}
              style={{ '--mega-cols': grouped.length } as React.CSSProperties}
            >
                <button
                  className={styles.megaCloseBtn}
                  onClick={() => setToolsOpen(false)}
                  aria-label={t('closeMenu')}
                >
                  &times;
                </button>
                {grouped.map((group) => (
                  <div key={group.category} className={styles.megaColumn}>
                    <div className={styles.megaCategoryLabel}>{group.label || '\u00A0'}</div>
                    {group.tools.map((tool) => (
                      <Link
                        key={tool.slug}
                        href={`/${tool.slug}`}
                        prefetch={false}
                        className={styles.megaItem}
                        data-ph-capture-attribute-source="mega-menu"
                        data-ph-capture-attribute-tool-slug={tool.slug}
                        onClick={(e) => {
                          if (!e.metaKey && !e.ctrlKey) setToolsOpen(false)
                          trackNavClick({ target: tool.slug, source: 'mega-menu' })
                        }}
                      >
                        <span className={styles.megaItemHeader}>
                          <ToolIcon slug={tool.slug} width={16} height={16} className={styles.megaItemIcon} />
                          <span className={styles.megaItemName}>{toolsT(`${tool.slug}.name`)}</span>
                        </span>
                        <span className={styles.megaItemDesc}>{toolsT(`${tool.slug}.description`)}</span>
                      </Link>
                    ))}
                  </div>
              ))}
            </div>
          )}
        </div>
        <Link
          href="/learn/glossary"
          className={styles.navLink}
          data-ph-capture-attribute-source="mega-menu"
          onClick={() => trackNavClick({ target: 'glossary', source: 'mega-menu' })}
        >{t('glossary')}</Link>
        <div className={styles.spacer} />
        <Link href="/contact" prefetch={false} className={`${styles.navLink} ${styles.contactLink}`}>{t('contact')}</Link>
        <span className={styles.desktopThemeToggle}><ThemeToggle theme={theme} onChange={onThemeChange} /></span>
        <LanguageSwitcher />
      </div>
    </nav>
  )
}
