import type { CSSProperties, ReactNode } from 'react'
import styles from './AnimatedGrid.module.css'

interface AnimatedGridProps {
  children: ReactNode
  className?: string
}

export function AnimatedGrid({ children, className }: AnimatedGridProps) {
  return (
    <div className={`${styles.grid} ${className ?? ''}`}>
      {children}
    </div>
  )
}

const STAGGER_MS = 50
const MAX_STAGGER_INDEX = 24

export function AnimatedItem({
  children,
  className,
  index = 0,
}: {
  children: ReactNode
  className?: string
  index?: number
}) {
  const safeIndex = Math.min(index, MAX_STAGGER_INDEX)
  const style: CSSProperties = { animationDelay: `${safeIndex * STAGGER_MS}ms` }
  return (
    <div className={`${styles.item} ${className ?? ''}`} style={style}>
      {children}
    </div>
  )
}
