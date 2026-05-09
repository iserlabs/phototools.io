import type { ReactNode } from 'react'
import styles from './legal-page.module.css'

export function PrivacySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

export function SectionParagraph({ children }: { children: ReactNode }) {
  return <p className={styles.sectionParagraph}>{children}</p>
}
