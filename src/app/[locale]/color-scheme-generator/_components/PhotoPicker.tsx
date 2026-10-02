'use client'

import { useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { getPixelColor, useMagnifier } from './useMagnifier'
import { DropZone } from './DropZone'
import { ModalDialog } from '@/components/shared/ModalDialog'
import styles from './PhotoPicker.module.css'

interface PhotoPickerProps {
  onColorPick: (hex: string) => void
  onClose: () => void
  initialFile?: File
}

export function PhotoPicker({ onColorPick, onClose, initialFile }: PhotoPickerProps) {
  const t = useTranslations('toolUI.color-scheme-generator')
  const imageLoadedRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { magnifier, magCanvasRef, handlePointerMove, handlePointerLeave } = useMagnifier(canvasRef)

  const drawImage = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const maxW = window.innerWidth * 0.8
    const maxH = window.innerHeight * 0.7
    const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight)
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }, [])

  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const src = e.target?.result as string
        const img = new Image()
        img.onload = () => {
          imageRef.current = img
          drawImage(img)
          imageLoadedRef.current = true
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    },
    [drawImage],
  )

  useEffect(() => {
    if (initialFile) loadFile(initialFile)
  }, [initialFile, loadFile])

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) drawImage(imageRef.current)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawImage])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const canvasX = Math.round((e.clientX - rect.left) * scaleX)
      const canvasY = Math.round((e.clientY - rect.top) * scaleY)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const hex = getPixelColor(ctx, canvasX, canvasY)
      onColorPick(hex)
      onClose()
    },
    [onColorPick, onClose],
  )

  const handleChangePhoto = useCallback(() => {
    imageLoadedRef.current = false
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
    setTimeout(() => fileInputRef.current?.click(), 0)
  }, [])

  const imageLoaded = imageRef.current !== null

  return (
    <ModalDialog className={styles.modal} aria-label={t('pickColorFromPhoto')} onClose={onClose}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('pickColorFromPhoto')}</h3>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('close')}>&times;</button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f) }}
      />

      {!imageLoaded && <DropZone onFile={loadFile} />}

      <div className={styles.canvasWrapper} style={{ display: imageLoaded ? 'flex' : 'none' }}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
        />
      </div>

      {imageLoaded && (
        <button type="button" className={styles.changeLink} onClick={handleChangePhoto}>
          {t('changePhoto')}
        </button>
      )}

      <p className={styles.privacy}>{t('privacyNote')}</p>

      {magnifier && (
        <>
          <div className={styles.magnifier} style={{ left: magnifier.vpX, top: magnifier.vpY }}>
            <canvas
              ref={magCanvasRef}
              style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
            />
          </div>
          <div className={styles.hexBadge} style={{ left: magnifier.vpX, top: magnifier.vpY + 86 }}>
            {magnifier.hex}
          </div>
        </>
      )}
    </ModalDialog>
  )
}
