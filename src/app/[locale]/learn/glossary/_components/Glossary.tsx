'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { GLOSSARY } from '@/lib/data/glossary'
import { getLiveTools } from '@/lib/data/tools'
import { Link } from '@/lib/i18n/navigation'
import { trackGlossarySearch, trackGlossaryEntryView } from '@/lib/analytics'
import styles from './Glossary.module.css'

const LIVE_TOOLS = getLiveTools()
const LIVE_SLUGS = new Set(LIVE_TOOLS.map((t) => t.slug))

interface ResolvedEntry {
  id: string
  term: string
  definition: string
  relatedTool?: string
}

export function Glossary() {
  const t = useTranslations('glossary')
  const toolsT = useTranslations('tools')

  const entries: ResolvedEntry[] = useMemo(
    () =>
      GLOSSARY.map((e) => ({
        id: e.id,
        term: t(`entries.${e.id}.term` as Parameters<typeof t>[0]),
        definition: t(`entries.${e.id}.definition` as Parameters<typeof t>[0]),
        relatedTool: e.relatedTool,
      })),
    [t],
  )

  const [query, setQuery] = useState('')
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const prevQueryRef = useRef('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return entries
    return entries.filter(
      (entry) =>
        entry.term.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q),
    )
  }, [query, entries])

  useEffect(() => {
    const q = query.trim()
    if (!q || q === prevQueryRef.current) return
    const timer = setTimeout(() => {
      trackGlossarySearch({ search_term: q, results_count: filtered.length })
      prevQueryRef.current = q
    }, 500)
    return () => clearTimeout(timer)
  }, [query, filtered.length])

  const grouped = useMemo(() => {
    const groups: Record<string, ResolvedEntry[]> = {}
    for (const entry of filtered) {
      const letter = entry.term[0].toUpperCase()
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(entry)
    }
    return groups
  }, [filtered])

  // Derive section keys from actual data — supports Latin and non-Latin scripts
  const sectionKeys = useMemo(() => Object.keys(grouped).sort(), [grouped])
  const scrollToLetter = useCallback((letter: string) => {
    sectionRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div>
      <input
        className={styles.search}
        type="text"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchAriaLabel')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className={styles.alphabet}>
        {sectionKeys.map((letter) => (
          <button
            key={letter}
            className={styles.letterBtn}
            onClick={() => scrollToLetter(letter)}
          >
            {letter}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.noResults}>{t('noResults')}</div>
      )}

      {sectionKeys.map((letter) => (
        <div
          key={letter}
          className={styles.section}
          ref={(el) => { sectionRefs.current[letter] = el }}
        >
          <div className={styles.sectionLetter}>{letter}</div>
          {grouped[letter].map((entry) => (
            <div key={entry.id} className={styles.termItem}>
              <div className={styles.termName}>{entry.term}</div>
              <div className={styles.termDef}>{entry.definition}</div>
              {entry.relatedTool && LIVE_SLUGS.has(entry.relatedTool) && (
                <Link
                  className={styles.toolLink}
                  href={`/${entry.relatedTool}`}
                  onClick={() => trackGlossaryEntryView({ term_id: entry.id })}
                >
                  {t('tryTool', { toolName: toolsT(`${entry.relatedTool}.name`) })} &rarr;
                </Link>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
