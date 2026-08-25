'use client'

import * as Tooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import styles from './HintTooltip.module.css'

interface HintTooltipProps {
  /** Plain-text tooltip body. */
  text: string
  /** Accessible name for the trigger — the visual glyph alone isn't one. */
  label: string
  /** Trigger glyph, e.g. "?" or "*". */
  children: ReactNode
  /** Trigger styling, from the caller's CSS module. */
  className?: string
}

/**
 * Plain-text tooltip on a small inline glyph. Unlike a CSS ::after tooltip,
 * the content renders in a portal, so it is never clipped by overflow
 * scroll/hidden ancestors (sidebars). The trigger is a span, not a button,
 * so it stays valid inside a <label> (labels may not contain a second
 * labelable element).
 */
export function HintTooltip({ text, label, children, className }: HintTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className={className}
            tabIndex={0}
            aria-label={label}
            // Inside a <label>, a click on the glyph would otherwise toggle
            // the row's checkbox — a misclick trap when aiming for the hint.
            onClick={e => e.preventDefault()}
          >
            {children}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className={styles.popover} side="top" sideOffset={6} collisionPadding={8}>
            {text}
            <Tooltip.Arrow className={styles.arrow} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
