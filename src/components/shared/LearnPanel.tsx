'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { getSkeletonBySlug, isChallengeComplete, clearChallengeProgressForTool } from '@/lib/data/education'
import { trackLearnPanelOpen, trackLearnPanelSectionView, trackToolGuideClick } from '@/lib/analytics'
import { useScrollDepth } from '@/lib/analytics/hooks/useScrollDepth'
import { ChallengeCard, ChallengeNavDot } from './ChallengeCard'
import { FaqSection } from './FaqSection'
import { RelatedTools } from './RelatedTools'
import styles from './LearnPanel.module.css'

interface LearnPanelProps {
  slug: string
  closable?: boolean
  guides?: Array<{ slug: string; title: string }>
}

export function LearnPanel({ slug, closable = false, guides = [] }: LearnPanelProps) {
  const t = useTranslations('common.learn')
  const et = useTranslations(`education.${slug}`)
  const skel = getSkeletonBySlug(slug)
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const scrollRef = useScrollDepth({ event: 'learn_panel_scroll_depth' })

  useEffect(() => {
    trackLearnPanelSectionView({ section: 'beginner' })
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1023)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!skel) return
    const ids = new Set<string>()
    for (const c of skel.challenges) {
      if (isChallengeComplete(c.id)) ids.add(c.id)
    }
    setCompletedIds(ids)
  }, [skel])

  if (!skel) return null

  const challenge = skel.challenges[challengeIndex]
  const showCloseBtn = isMobile || closable

  if (showCloseBtn && collapsed) {
    return (
      <div className={styles.collapsed}>
        <button className={styles.reopenBtn} onClick={() => { trackLearnPanelOpen({ tool_slug: slug }); setCollapsed(false) }} aria-label={t('openPanel')}>
          {t('title')}
        </button>
      </div>
    )
  }

  return (
    <aside className={styles.panel} ref={scrollRef}>
      <header className={styles.header}>
        <h2 className={styles.headerTitle}>{t('title')}</h2>
        <span className={styles.spacer} />
        {showCloseBtn && (
          <button className={styles.closeBtn} onClick={() => setCollapsed(true)} aria-label={t('collapsePanel')}>
            &times;
          </button>
        )}
      </header>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('whatIsThis')}</h3>
        <p className={styles.sectionText}>{et('beginner')}</p>
      </section>

      {skel.deeperSections !== undefined ? (
        Array.from({ length: skel.deeperSections }, (_, i) => (
          <section key={i} className={styles.section}>
            <h3 className={styles.sectionTitle}>{et(`deeper.${i}.heading`)}</h3>
            <p className={styles.sectionText}>{et(`deeper.${i}.text`)}</p>
          </section>
        ))
      ) : (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('howItWorks')}</h3>
          <p className={styles.sectionText}>{et('deeper')}</p>
        </section>
      )}

      {skel.keyFactorCount > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('keyFactors')}</h3>
          <div className={styles.factors}>
            {Array.from({ length: skel.keyFactorCount }, (_, i) => (
              <div key={i} className={styles.factor}>
                <span className={styles.factorLabel}>{et(`keyFactors.${i}.label`)}</span> — {et(`keyFactors.${i}.description`)}
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.from({ length: skel.tipCount }, (_, i) => (
        <section key={i} className={styles.tip}>
          <h3 className={styles.tipLabel}>{t('proTip')}</h3>
          <div className={styles.tipText}>{et(`tips.${i}.text`)}</div>
        </section>
      ))}

      {challenge && (
        <ChallengeCard
          challenge={challenge}
          challengeIndex={challengeIndex}
          slug={slug}
          et={et}
          onAdvance={challengeIndex < skel.challenges.length - 1
            ? () => setChallengeIndex(challengeIndex + 1)
            : undefined}
          onComplete={(id) => setCompletedIds((prev) => new Set(prev).add(id))}
        >
          <div className={styles.challengeNav}>
            {skel.challenges.map((c, i) => (
              <ChallengeNavDot
                key={c.id}
                index={i}
                complete={completedIds.has(c.id)}
                active={i === challengeIndex}
                onClick={() => setChallengeIndex(i)}
              />
            ))}
            {completedIds.size > 0 && (
              <button
                className={styles.resetBtn}
                onClick={() => {
                  clearChallengeProgressForTool(skel.challenges.map((c) => c.id))
                  setCompletedIds(new Set())
                  setChallengeIndex(0)
                }}
                aria-label={t('resetAllChallenges')}
                title={t('resetAll')}
              >
                ↺
              </button>
            )}
          </div>
        </ChallengeCard>
      )}
      {guides.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('guidesTitle')}</h3>
          <ul className={styles.guidesList}>
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/guides/${guide.slug}`}
                  prefetch={false}
                  className={styles.guidesLink}
                  onClick={() => trackToolGuideClick({ tool_slug: slug, guide_slug: guide.slug })}
                >
                  {guide.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <FaqSection slug={slug} />
      <RelatedTools currentSlug={slug} />
    </aside>
  )
}
