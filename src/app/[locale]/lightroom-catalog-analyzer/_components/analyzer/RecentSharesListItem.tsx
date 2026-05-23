'use client'

import { useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import type { ShareRecord } from '@/lib/lrcat/share-storage'
import { removeShare, summarizeFilter } from '@/lib/lrcat/share-storage'
import { deleteShare } from './share-client'

interface Props {
  record: ShareRecord
  onRemoved: (id: string) => void
}

export function RecentSharesListItem({ record, onRemoved }: Props) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.share.recent')
  const locale = useLocale()
  const [busy, setBusy] = useState(false)
  const fmt = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(ms))

  const onDelete = useCallback(async () => {
    setBusy(true)
    try {
      await deleteShare(record.id)
      removeShare(record.id)
      onRemoved(record.id)
    } finally {
      setBusy(false)
    }
  }, [record.id, onRemoved])

  const filterSummary = record.filterContext ? summarizeFilter(record.filterContext) : null

  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <p style={{ margin: 0, fontWeight: 600 }}>{t('idLabel', { last4: record.id.slice(-4) })}</p>
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {t('created', { date: fmt(record.createdAt) })} · {t('expires', { date: fmt(record.expiresAt) })}
        </p>
        {filterSummary && (
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--accent-secondary)' }}>
            {t('filtered', { summary: filterSummary })}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', whiteSpace: 'nowrap' }}>
        <a href={record.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)' }}>{t('open')}</a>
        <button type="button" onClick={onDelete} disabled={busy} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}>
          {t('delete')}
        </button>
      </div>
    </li>
  )
}
