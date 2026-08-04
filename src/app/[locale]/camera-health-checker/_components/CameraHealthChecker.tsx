'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import ExifReader from 'exifreader'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { lifeVerdict, SHUTTER_RATINGS } from '@/lib/data/shutterCount'
import { FileDropZone } from '@/components/shared/FileDropZone'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import { buildHealthReport, isEmptyReport, type HealthReport } from './healthReport'
import styles from './CameraHealthChecker.module.css'

const ACCEPT = 'image/*,.nef,.nrw,.dng,.tif,.tiff'
const DASH = '—'

function ControlsPanel({ onFile }: { onFile: (file: File) => void }) {
  const t = useTranslations('toolUI.camera-health-checker')
  const toolsT = useTranslations('tools')
  return (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>{toolsT('camera-health-checker.name')}</h2>
        <p className={styles.description}>{toolsT('camera-health-checker.description')}</p>
      </div>
      <FileDropZone onFile={onFile} accept={ACCEPT} prompt={t('dropPrompt')} />
    </>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value ?? DASH}</span>
    </div>
  )
}

function ShutterSection({ report }: { report: HealthReport }) {
  const t = useTranslations('toolUI.camera-health-checker')
  const { shutter, ratedActuations, brand } = report

  if (shutter.count === null) {
    return (
      <p className={styles.note}>
        {brand ? t(`shutterUnavailable.${brand.support}`, { brand: brand.label }) : t('shutterUnavailable.unknown')}
      </p>
    )
  }

  const rated = ratedActuations ?? SHUTTER_RATINGS[2].count
  const fraction = shutter.count / rated
  const verdict = lifeVerdict(fraction)
  return (
    <>
      <Row label={t('shutterCount')} value={shutter.count.toLocaleString()} />
      <Row
        label={t('ratedLife')}
        value={`${rated.toLocaleString()}${ratedActuations === null ? ` ${t('ratedAssumed')}` : ''}`}
      />
      <div className={styles.lifeBarTrack}>
        <div className={`${styles.lifeBarFill} ${styles[`fill_${verdict}`]}`} style={{ width: `${Math.min(fraction * 100, 100)}%` }} />
      </div>
      <div className={styles.lifeRow}>
        <span className={styles.lifePercent}>{t('lifeUsed', { percent: Math.round(fraction * 100) })}</span>
        <span className={`${styles.badge} ${styles[`verdict_${verdict}`]}`}>{t(`verdict.${verdict}`)}</span>
      </div>
    </>
  )
}

function Report({ report }: { report: HealthReport }) {
  const t = useTranslations('toolUI.camera-health-checker')
  const ageText = report.bodyAgeYears !== null && report.releaseYear !== null
    ? t('ageValue', { years: report.bodyAgeYears, year: report.releaseYear })
    : null

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>{t('sections.body')}</h3>
        <Row label={t('cameraModel')} value={report.displayModel ?? report.model} />
        <Row label={t('make')} value={report.make} />
        <Row label={t('serialNumber')} value={report.serial} />
        <Row label={t('firmware')} value={report.firmware} />
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>{t('sections.age')}</h3>
        <Row label={t('bodyAge')} value={ageText} />
        <Row label={t('shotDate')} value={report.shotDate} />
        {report.bodyAgeYears === null && <p className={styles.note}>{t('ageUnknown')}</p>}
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>{t('sections.shutter')}</h3>
        <ShutterSection report={report} />
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>{t('sections.lens')}</h3>
        <Row label={t('lensModel')} value={report.lensModel} />
        <Row label={t('lensSerial')} value={report.lensSerial} />
      </section>
    </div>
  )
}

export function CameraHealthChecker() {
  const t = useTranslations('toolUI.camera-health-checker')
  const { trackParam } = useToolSession()
  const [report, setReport] = useState<HealthReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    trackParam({ param_name: 'file_type', param_value: file.type || file.name.split('.').pop() || 'unknown', input_type: 'button' })
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer
      let tags: ExifReader.Tags = {} as ExifReader.Tags
      try {
        tags = ExifReader.load(buffer)
      } catch {
        // fall through — the report builder handles missing tags
      }
      const built = buildHealthReport(tags, buffer)
      if (isEmptyReport(built)) {
        setError(t('errorNoMetadata'))
        setReport(null)
        return
      }
      setReport(built)
    }
    reader.onerror = () => setError(t('errorRead'))
    reader.readAsArrayBuffer(file)
  }, [t, trackParam])

  return (
    <div className={styles.app}>
      <ToolHeading slug="camera-health-checker" />
      <div className={styles.appBody}>
        <div className={styles.sidebar}>
          <ToolActions toolSlug="camera-health-checker" />
          <ControlsPanel onFile={handleFile} />
        </div>

        <div className={styles.main}>
          <div className={styles.mobileControls}>
            <ControlsPanel onFile={handleFile} />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          {report ? <Report report={report} /> : <p className={styles.empty}>{t('emptyState')}</p>}
        </div>

        <div className={styles.desktopOnly}>
          <LearnPanel slug="camera-health-checker" />
        </div>
      </div>

      <RelatedTools variant="inline" currentSlug="camera-health-checker" />
      <div className={styles.mobileOnly}>
        <LearnPanel slug="camera-health-checker" />
      </div>
    </div>
  )
}
