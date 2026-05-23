'use client'

import { useState, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useTranslations } from 'next-intl'
import type { InsightBlob } from '@/lib/lrcat/types'
import { createShare, ShareError, type CreateShareResult, type ExpiresIn } from './share-client'
import styles from './ShareDisclosureModal.module.css'

interface Props {
  blob: InsightBlob
  onClose: () => void
  onCreated: (result: CreateShareResult) => void
}

const OPTIONS: Array<{ value: ExpiresIn; key: 'expires24h' | 'expires7d' | 'expires30d' }> = [
  { value: '24h', key: 'expires24h' },
  { value: '7d', key: 'expires7d' },
  { value: '30d', key: 'expires30d' },
]

export function ShareDisclosureModal({ blob, onClose, onCreated }: Props) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.share')
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('30d')
  const [busy, setBusy] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const onCreate = useCallback(async () => {
    setBusy(true)
    setErrorKey(null)
    try {
      const result = await createShare(blob, expiresIn)
      onCreated(result)
    } catch (err) {
      const kind = err instanceof ShareError ? err.kind : 'unknown'
      setErrorKey(kind)
    } finally {
      setBusy(false)
    }
  }, [blob, expiresIn, onCreated])

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} aria-describedby={undefined}>
          <Dialog.Title className={styles.title}>{t('disclosure.title')}</Dialog.Title>

          <div className={styles.section}>
            <p className={styles.heading}>{t('disclosure.uploadedHeading')}</p>
            <p>{t('disclosure.uploaded')}</p>
          </div>
          <div className={styles.section}>
            <p className={styles.heading}>{t('disclosure.notUploadedHeading')}</p>
            <p>{t('disclosure.notUploaded')}</p>
          </div>

          <fieldset className={styles.expiry}>
            <legend className={styles.heading}>{t('disclosure.expiresLabel')}</legend>
            {OPTIONS.map((o) => (
              <label key={o.value}>
                <input
                  type="radio"
                  name="lrcat-share-expiry"
                  value={o.value}
                  checked={expiresIn === o.value}
                  onChange={() => setExpiresIn(o.value)}
                />
                <span>{t(`disclosure.${o.key}`)}</span>
              </label>
            ))}
          </fieldset>

          {errorKey && <p className={styles.error} role="alert">{t(`errors.${errorKey}`)}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose}>
              {t('disclosure.cancel')}
            </button>
            <button type="button" className={styles.create} onClick={onCreate} disabled={busy}>
              {busy ? t('disclosure.creating') : t('disclosure.create')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
