'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import * as Dialog from '@radix-ui/react-dialog'
import { trackShareClick } from '@/lib/analytics'
import styles from './ShareModal.module.css'

interface ShareModalProps {
  toolName: string
  toolSlug: string
  onClose: () => void
}

export function ShareModal({ toolName, toolSlug, onClose }: ShareModalProps) {
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
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} aria-describedby={undefined}>
          <div className={styles.header}>
            <Dialog.Title className={styles.title}>{t('title')}</Dialog.Title>
            <Dialog.Close className={styles.closeBtn} aria-label={t('closeModal')}>&times;</Dialog.Close>
          </div>

          <div className={styles.section}>
            <label>{t('directLink')}</label>
            <div className={styles.row}>
              <input type="text" readOnly value={snippets.link} />
              <button onClick={() => copy('link', snippets.link)}>
                {copied === 'link' ? t('copied') : t('copy')}
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <label>{t('markdown')}</label>
            <div className={styles.row}>
              <input type="text" readOnly value={snippets.markdown} />
              <button onClick={() => copy('markdown', snippets.markdown)}>
                {copied === 'markdown' ? t('copied') : t('copy')}
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <label>{t('bbcode')}</label>
            <div className={styles.row}>
              <input type="text" readOnly value={snippets.bbcode} />
              <button onClick={() => copy('bbcode', snippets.bbcode)}>
                {copied === 'bbcode' ? t('copied') : t('copy')}
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <label>{t('htmlEmbed')}</label>
            <div className={styles.row}>
              <input type="text" readOnly value={snippets.iframe} />
              <button onClick={() => copy('iframe', snippets.iframe)}>
                {copied === 'iframe' ? t('copied') : t('copy')}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
