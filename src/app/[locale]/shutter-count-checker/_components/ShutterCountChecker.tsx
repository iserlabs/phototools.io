'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import ExifReader from 'exifreader'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { extractShutterCount, type ShutterCountResult } from '@/lib/utils/shutter-count'
import { SHUTTER_RATINGS, CAMERA_BRANDS, matchBrand, lifeVerdict, type CameraBrand } from '@/lib/data/shutterCount'
import { findCameraRelease } from '@/lib/data/cameraReleases'
import { FileDropZone } from '@/components/shared/FileDropZone'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import calc from '@/components/shared/Calculator.module.css'
import styles from './ShutterCountChecker.module.css'

const ACCEPT = 'image/*,.nef,.nrw,.dng,.tif,.tiff'

interface FileResult {
  shutter: ShutterCountResult
  make: string | null
  model: string | null
}

function readTag(tags: ExifReader.Tags, key: string): string | null {
  const tag = tags[key]
  if (tag && 'description' in tag && typeof tag.description === 'string' && tag.description) return tag.description
  return null
}

function ControlsPanel({ onFile }: { onFile: (file: File) => void }) {
  const t = useTranslations('toolUI.shutter-count-checker')
  const toolsT = useTranslations('tools')
  return (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>{toolsT('shutter-count-checker.name')}</h2>
        <p className={styles.description}>{toolsT('shutter-count-checker.description')}</p>
      </div>
      <FileDropZone onFile={onFile} accept={ACCEPT} prompt={t('dropPrompt')} />
    </>
  )
}

function SupportMatrix() {
  const t = useTranslations('toolUI.shutter-count-checker')
  return (
    <div className={styles.matrix}>
      <h3 className={styles.sectionTitle}>{t('supportTitle')}</h3>
      {CAMERA_BRANDS.map((b) => (
        <div key={b.id} className={styles.matrixRow}>
          <span className={styles.matrixBrand}>{b.label}</span>
          <span className={`${styles.badge} ${styles[b.support]}`}>{t(`status.${b.support}`)}</span>
          <span className={styles.matrixNote}>{t(`brands.${b.id}`)}</span>
        </div>
      ))}
    </div>
  )
}

function LifePanel({ count }: { count: number }) {
  const t = useTranslations('toolUI.shutter-count-checker')
  const [ratingIdx, setRatingIdx] = useState(2) // 200k default
  const rated = SHUTTER_RATINGS[ratingIdx].count
  const fraction = count / rated
  const verdict = lifeVerdict(fraction)
  return (
    <div className={styles.lifePanel}>
      <div className={calc.field}>
        <label className={calc.label}>{t('ratedLife')}</label>
        <select className={calc.select} value={ratingIdx} onChange={(e) => setRatingIdx(Number(e.target.value))}>
          {SHUTTER_RATINGS.map((r, i) => (
            <option key={r.id} value={i}>
              {t(`ratings.${r.id}`)} — {r.count.toLocaleString()}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.lifeBarTrack}>
        <div
          className={`${styles.lifeBarFill} ${styles[`fill_${verdict}`]}`}
          style={{ width: `${Math.min(fraction * 100, 100)}%` }}
        />
      </div>
      <div className={styles.lifeRow}>
        <span className={styles.lifePercent}>{t('lifeUsed', { percent: Math.round(fraction * 100) })}</span>
        <span className={`${styles.badge} ${styles[`verdict_${verdict}`]}`}>{t(`verdict.${verdict}`)}</span>
      </div>
    </div>
  )
}

function ResultPanel({ result }: { result: FileResult }) {
  const t = useTranslations('toolUI.shutter-count-checker')
  const { shutter, make, model } = result
  const brand: CameraBrand | null = matchBrand(make)
  const release = findCameraRelease(model)

  if (shutter.count === null) {
    return (
      <div className={styles.noCount}>
        <h3 className={styles.sectionTitle}>{t('noCountTitle')}</h3>
        {model && <p className={styles.cameraLine}>{release?.model ?? model}</p>}
        <p className={styles.noCountText}>{brand ? t(`brands.${brand.id}`) : t('noCountGeneric')}</p>
      </div>
    )
  }

  return (
    <div className={styles.result}>
      <span className={styles.countLabel}>{t('countLabel')}</span>
      <span className={styles.countValue}>{shutter.count.toLocaleString()}</span>
      {model && <p className={styles.cameraLine}>{release?.model ?? model}</p>}
      <p className={styles.sourceNote}>{t(`source.${shutter.source}`)}</p>
      <LifePanel count={shutter.count} />
    </div>
  )
}

export function ShutterCountChecker() {
  const t = useTranslations('toolUI.shutter-count-checker')
  const { trackParam } = useToolSession()
  const [result, setResult] = useState<FileResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    trackParam({ param_name: 'file_type', param_value: file.type || file.name.split('.').pop() || 'unknown', input_type: 'button' })
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer
      const shutter = extractShutterCount(buffer)
      let make: string | null = null
      let model: string | null = null
      try {
        const tags = ExifReader.load(buffer)
        make = readTag(tags, 'Make')
        model = readTag(tags, 'Model')
      } catch {
        // count extraction may still have succeeded — make/model just stay unknown
      }
      if (shutter.count === null && make === null && model === null) {
        setError(t('errorRead'))
        setResult(null)
        return
      }
      setResult({ shutter, make, model })
    }
    reader.onerror = () => setError(t('errorRead'))
    reader.readAsArrayBuffer(file)
  }, [t, trackParam])

  return (
    <div className={styles.app}>
      <ToolHeading slug="shutter-count-checker" />
      <div className={styles.appBody}>
        <div className={styles.sidebar}>
          <ToolActions toolSlug="shutter-count-checker" />
          <ControlsPanel onFile={handleFile} />
        </div>

        <div className={styles.main}>
          <div className={styles.mobileControls}>
            <ControlsPanel onFile={handleFile} />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          {result && <ResultPanel result={result} />}
          <SupportMatrix />
        </div>

        <div className={styles.desktopOnly}>
          <LearnPanel slug="shutter-count-checker" />
        </div>
      </div>

      <RelatedTools variant="inline" currentSlug="shutter-count-checker" />
      <div className={styles.mobileOnly}>
        <LearnPanel slug="shutter-count-checker" />
      </div>
    </div>
  )
}
