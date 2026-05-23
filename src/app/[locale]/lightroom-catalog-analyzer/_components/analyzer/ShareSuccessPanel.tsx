'use client'

import { useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { deleteShare } from './share-client'
import type { CreateShareResult } from './share-client'
import { removeShare } from '@/lib/lrcat/share-storage'

interface Props {
  result: CreateShareResult
  onDeleted: () => void
}

export function ShareSuccessPanel({ result, onDeleted }: Props) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.share.success')
  const locale = useLocale()
  const [deleting, setDeleting] = useState(false)

  const expiresLabel = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(result.expiresAt))

  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(result.url).then(() => toast(t('copied')))
  }, [result.url, t])

  const onDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await deleteShare(result.id)
      removeShare(result.id)
      toast(t('deleted'))
      onDeleted()
    } finally {
      setDeleting(false)
    }
  }, [result.id, t, onDeleted])

  return (
    <section aria-label={t('title')} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ marginTop: 0 }}>{t('title')}</h3>
      <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{t('urlLabel')}</label>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <input
          readOnly
          value={result.url}
          aria-label={t('urlLabel')}
          onFocus={(e) => e.currentTarget.select()}
          style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
        />
        <button type="button" onClick={onCopy} style={{ background: 'var(--accent)', color: 'var(--text-on-accent)', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>
          {t('copy')}
        </button>
      </div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 8 }}>{t('expiresOn', { date: expiresLabel })}</p>
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)' }}>{t('openNewTab')}</a>
        <button type="button" onClick={onDelete} disabled={deleting} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}>
          {t('delete')}
        </button>
      </div>
    </section>
  )
}
