'use client'

import { useState, useCallback, useEffect, useId, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { trackShareClick } from '@/lib/analytics'
import { ModalDialog } from './ModalDialog'
import styles from './ShareModal.module.css'

interface ShareModalProps {
  toolName: string
  toolSlug: string
  onClose: () => void
}

const FIELDS = [
  { key: 'link', label: 'directLink' },
  { key: 'markdown', label: 'markdown' },
  { key: 'bbcode', label: 'bbcode' },
  { key: 'iframe', label: 'htmlEmbed' },
] as const

export function ShareModal({ toolName, toolSlug, onClose }: ShareModalProps) {
  const titleId = useId()
  const t = useTranslations('common.share')
  const tToast = useTranslations('common.toast')
  const [copied, setCopied] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
  }, [])

  const baseUrl = 'https://www.phototools.io'
  const search = typeof window !== 'undefined' ? window.location.search : ''
  const toolUrl = `${baseUrl}/${toolSlug}${search}`
  const embedParams = search ? `${search}&embed=1` : '?embed=1'
  const embedUrl = `${baseUrl}/${toolSlug}${embedParams}`
  const label = toolName

  const snippets = {
    link: toolUrl,
    markdown: `[${label}](${toolUrl})`,
    bbcode: `[url=${toolUrl}]${label}[/url]`,
    iframe: `<iframe src="${embedUrl}" width="800" height="600" style="border:none;" title="${label}"></iframe>`,
  }

  const copy = useCallback((key: string, text: string) => {
    const methodMap: Record<string, 'copy-link' | 'embed' | 'markdown' | 'bbcode'> = {
      link: 'copy-link',
      markdown: 'markdown',
      bbcode: 'bbcode',
      iframe: 'embed',
    }
    trackShareClick({ method: methodMap[key] || 'copy-link' })
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      toast(tToast('copied'))
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(null), 2000)
    })
  }, [tToast])

  return (
    <ModalDialog className={styles.modal} aria-labelledby={titleId} onClose={onClose}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>{t('title')}</h2>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('closeModal')}>&times;</button>
      </div>

      {FIELDS.map(({ key, label }) => (
        <div key={key} className={styles.section}>
          <label htmlFor={`${titleId}-${key}`}>{t(label)}</label>
          <div className={styles.row}>
            <input id={`${titleId}-${key}`} type="text" readOnly value={snippets[key]} />
            <button type="button" onClick={() => copy(key, snippets[key])}>
              {copied === key ? t('copied') : t('copy')}
            </button>
          </div>
        </div>
      ))}
    </ModalDialog>
  )
}
