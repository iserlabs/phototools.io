'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import ExifReader from 'exifreader'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { PhotoUploadPanel } from '@/components/shared/PhotoUploadPanel'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import { SAMPLE_PHOTO } from './exifTypes'
import type { ExifResult } from './exifTypes'
import { parseExif } from './exifParser'
import { HistogramTriple, type HistogramTripleHandle } from './HistogramTriple'
import { AnalysisCards, ExifSectionsGrid } from './ExifSections'
import { buildExportCanvas } from './buildExportCanvas'
import styles from './ExifViewer.module.css'

function ControlsPanel({ onFile, onSample }: { onFile: (file: File) => void; onSample: () => void }) {
  const t = useTranslations('toolUI.exif-viewer')
  return (
    <>
      <PhotoUploadPanel onFile={onFile} />
      <button className={styles.sampleBtn} onClick={onSample}>
        {t('loadExamplePhoto')}
      </button>
    </>
  )
}

export function ExifViewer() {
  const t = useTranslations('toolUI.exif-viewer')
  const { trackParam } = useToolSession()
  const [data, setData] = useState<ExifResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const exportCanvasRef = useRef<HTMLCanvasElement>(null)
  const histogramRef = useRef<HistogramTripleHandle>(null)
  const photoImgRef = useRef<HTMLImageElement>(null)

  const loadFromUrl = useCallback(async (url: string) => {
    setError(null)
    setData(null)
    setImageUrl(url)
    try {
      const resp = await fetch(url)
      const buffer = await resp.arrayBuffer()
      const tags = ExifReader.load(buffer)
      setData(parseExif(tags, buffer.byteLength))
    } catch {
      setError(t('couldNotReadExif'))
    }
  }, [t])

  const handleFile = useCallback((file: File) => {
    trackParam({ param_name: 'file_type', param_value: file.type, input_type: 'button' })
    setError(null)
    setData(null)
    if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(file))

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer
        const tags = ExifReader.load(buffer)
        setData(parseExif(tags, file.size))
      } catch {
        setError(t('couldNotReadExif'))
      }
    }
    reader.onerror = () => setError(t('failedToReadFile'))
    reader.readAsArrayBuffer(file)
  }, [imageUrl, t, trackParam])

  const handleBuildExport = useCallback(() => {
    const canvas = exportCanvasRef.current
    if (!canvas || !data) return
    buildExportCanvas(canvas, data, photoImgRef.current, histogramRef.current)
  }, [data])

  useEffect(() => {
    loadFromUrl(SAMPLE_PHOTO)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.app}>
      <ToolHeading slug="exif-viewer" />
      <div className={styles.appBody}>
        <div className={styles.sidebar}>
          <ToolActions toolSlug="exif-viewer" canvasRef={exportCanvasRef} imageFilename="exif-data.png" onBeforeCopyImage={handleBuildExport} />
          <ControlsPanel onFile={handleFile} onSample={() => loadFromUrl(SAMPLE_PHOTO)} />
        </div>

        <div className={styles.main}>
          <div className={styles.mobileControls}>
            <ControlsPanel onFile={handleFile} onSample={() => loadFromUrl(SAMPLE_PHOTO)} />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {imageUrl && (
            <div className={styles.imagePreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={photoImgRef} src={imageUrl} alt={t('uploadedPhoto')} className={styles.previewImg} decoding="async" />
            </div>
          )}

          {data ? (
            <>
              <AnalysisCards analysis={data.analysis} />
              {imageUrl && <HistogramTriple ref={histogramRef} imageUrl={imageUrl} />}
              <ExifSectionsGrid data={data} />
            </>
          ) : null}
        </div>

        <div className={styles.desktopOnly}>
          <LearnPanel slug="exif-viewer" />
        </div>
      </div>

      <RelatedTools variant="inline" currentSlug="exif-viewer" />
      <div className={styles.mobileOnly}>
        <LearnPanel slug="exif-viewer" />
      </div>
      <canvas ref={exportCanvasRef} style={{ display: 'none' }} />
    </div>
  )
}
