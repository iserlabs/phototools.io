'use client'

import { useState, useCallback, useRef, type RefObject } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { ShareModal } from './ShareModal'
import { copyLinkToClipboard, copyCanvasToClipboard } from '@/lib/utils/export'
import styles from './ToolActions.module.css'

interface ToolActionsProps {
  toolName?: string
  toolSlug: string
  onReset?: () => void
  canvasRef?: RefObject<HTMLCanvasElement | null>
  imageFilename?: string
  onBeforeCopyImage?: () => void
  hideTitle?: boolean
}

export function ToolActions({ toolName, toolSlug, onReset, canvasRef, imageFilename, onBeforeCopyImage, hideTitle }: ToolActionsProps) {
  const t = useTranslations('common')
  const toolsT = useTranslations('tools')
  const resolvedName = toolName ?? toolsT(`${toolSlug}.name`)
  const [showShare, setShowShare] = useState(false)
  // ShareModal is conditionally rendered (unmounted on close) rather than
  // toggling Radix's own `open` state, so Radix has no registered
  // Dialog.Trigger to fall back to and drops close-focus to <body>. Track
  // whichever button actually opened it (Share's no-navigator.share
  // fallback, or Embed) and hand it to ShareModal's onCloseAutoFocus so
  // keyboard/screen-reader users land back where they started.
  const shareTriggerRef = useRef<HTMLElement | null>(null)

  const openShare = useCallback(() => {
    shareTriggerRef.current = document.activeElement as HTMLElement | null
    setShowShare(true)
  }, [])

  const closeShare = useCallback(() => {
    setShowShare(false)
  }, [])

  const handleCopyLink = useCallback(async () => {
    const ok = await copyLinkToClipboard()
    toast(ok ? t('toast.linkCopied') : t('toast.failedToCopy'))
  }, [t])

  const handleCopyImage = useCallback(async () => {
    onBeforeCopyImage?.()
    if (!canvasRef?.current) return
    const ok = await copyCanvasToClipboard(canvasRef.current, imageFilename)
    toast(ok ? t('toast.imageCopied') : t('toast.failedToCopy'))
  }, [canvasRef, imageFilename, onBeforeCopyImage, t])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: resolvedName,
          url: window.location.href,
        })
      } catch {
        // User cancelled — do nothing
      }
      return
    }
    openShare()
  }, [resolvedName, openShare])

  return (
    <>
      {!hideTitle && <h2 className={styles.title}>{resolvedName}</h2>}
      <div className={styles.actions}>
        {canvasRef && (
          <button className={styles.btn} data-tooltip={t('actions.copyImage')} onClick={handleCopyImage} aria-label={t('actions.copyImage')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <circle cx="5.5" cy="5.5" r="1" />
              <path d="M14 10l-3-3-7 7" />
            </svg>
          </button>
        )}
        <button className={`${styles.btn} ${styles.btnReset}`} data-tooltip={t('actions.reset')} onClick={onReset ?? (() => { window.location.href = `/${toolSlug}` })} aria-label={t('actions.reset')}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 8a5.5 5.5 0 1 1 1.3 3.5" />
            <polyline points="2 11.5 2.5 8.5 5.5 9" />
          </svg>
        </button>
        <span className={styles.divider} />
        <button className={styles.btn} data-tooltip={t('actions.copyLink')} onClick={handleCopyLink} aria-label={t('actions.copyLink')}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 9.5a3 3 0 0 0 4.2.3l2-2a3 3 0 0 0-4.2-4.3l-1.1 1.1" />
            <path d="M9.5 6.5a3 3 0 0 0-4.2-.3l-2 2a3 3 0 0 0 4.2 4.3l1.1-1.1" />
          </svg>
        </button>
        <button className={styles.btn} data-tooltip={t('actions.share')} onClick={handleShare} aria-label={t('actions.share')}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8v5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8" />
            <polyline points="8 2 8 10" />
            <polyline points="5.5 4.5 8 2 10.5 4.5" />
          </svg>
        </button>
        <button className={styles.btn} data-tooltip={t('actions.embed')} onClick={openShare} aria-label={t('actions.embed')}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 4.5 2 8 5 11.5" />
            <polyline points="11 4.5 14 8 11 11.5" />
            <line x1="9" y1="3" x2="7" y2="13" />
          </svg>
        </button>
      </div>

      {showShare && (
        <ShareModal
          toolName={resolvedName}
          toolSlug={toolSlug}
          onClose={closeShare}
          triggerRef={shareTriggerRef}
        />
      )}
    </>
  )
}
