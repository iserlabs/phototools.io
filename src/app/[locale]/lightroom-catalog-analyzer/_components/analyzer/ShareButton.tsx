'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { InsightBlob } from '@/lib/lrcat/types'
import { ShareDisclosureModal } from './ShareDisclosureModal'
import { ShareSuccessPanel } from './ShareSuccessPanel'
import { appendShare } from '@/lib/lrcat/share-storage'
import type { CreateShareResult } from './share-client'

interface Props {
  blob: InsightBlob
  /** Optional className so the trigger matches the ExportBar button styling. */
  className?: string
  /** Test seam — when set, treats it as an immediate successful creation. */
  onCreatedForTest?: CreateShareResult
}

export function ShareButton({ blob, className, onCreatedForTest }: Props) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.share')
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<CreateShareResult | null>(null)

  const handleCreated = useCallback((r: CreateShareResult) => {
    appendShare({
      id: r.id,
      url: r.url,
      createdAt: Date.now(),
      expiresAt: new Date(r.expiresAt).getTime(),
      filterContext: r.filterContext,
    })
    setResult(r)
    setOpen(false)
  }, [])

  useEffect(() => {
    if (onCreatedForTest) handleCreated(onCreatedForTest)
  }, [onCreatedForTest, handleCreated])

  if (result) {
    return <ShareSuccessPanel result={result} onDeleted={() => setResult(null)} />
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        style={className ? undefined : { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}
      >
        {t('button')}
      </button>
      {open && (
        <ShareDisclosureModal
          blob={blob}
          onClose={() => setOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
