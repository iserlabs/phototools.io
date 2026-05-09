import { useTranslations } from 'next-intl'
import { getFaqsBySlug } from '@/lib/data/faq'
import styles from './FaqSection.module.css'

interface FaqSectionProps {
  slug: string
}

export function FaqSection({ slug }: FaqSectionProps) {
  const t = useTranslations(`toolUI.${slug}`)
  const headingT = useTranslations('common.faq')
  const faqs = getFaqsBySlug(slug)

  if (!faqs || faqs.questions.length === 0) return null

  return (
    <section className={styles.faqSection}>
      <h3 className={styles.faqTitle}>{headingT('heading')}</h3>
      <div className={styles.faqList}>
        {faqs.questions.map((q) => (
          <details key={q.id} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              {t(`faq.${q.id}.question`)}
            </summary>
            <p className={styles.faqAnswer}>
              {t(`faq.${q.id}.answer`)}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
