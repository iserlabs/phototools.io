'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { listActiveShares, type ShareRecord } from '@/lib/lrcat/share-storage'
import { RecentSharesListItem } from './RecentSharesListItem'

export function RecentSharesList() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.share.recent')
  const [records, setRecords] = useState<ShareRecord[]>([])

  // localStorage read must run client-side after mount (no SSR access).
  useEffect(() => { setRecords(listActiveShares()) }, [])

  const onRemoved = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }, [])

  if (records.length === 0) return null

  return (
    <section aria-labelledby="recent-shares-heading" style={{ marginTop: 32, padding: 20, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
      <h2 id="recent-shares-heading" style={{ marginTop: 0, fontSize: 'var(--text-lg)' }}>{t('title')}</h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 0 }}>{t('subtitle')}</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {records.map((r) => (
          <RecentSharesListItem key={r.id} record={r} onRemoved={onRemoved} />
        ))}
      </ul>
    </section>
  )
}
