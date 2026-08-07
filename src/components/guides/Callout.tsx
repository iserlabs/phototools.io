import type { ReactNode } from 'react'
import styles from './Callout.module.css'

interface CalloutProps {
  type: 'tip' | 'warning'
  children: ReactNode
}

export function Callout({ type, children }: CalloutProps) {
  return <aside className={`${styles.callout} ${styles[type]}`}>{children}</aside>
}
