'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileDropZone } from '@/components/shared/FileDropZone'
import type { AnalysisPhoto } from './useSampling'
import type { Sample } from './analyzerState'
import { SampleMarkers } from './SampleMarkers'
import styles from './PhotoPane.module.css'

export interface PhotoPaneProps {
  photo: AnalysisPhoto | null
  samples: Sample[]
  selectedId: string | null
  canAdd: boolean
  decodeFailed: boolean
  labels: { drop: string; decodeError: string; canvasLabel: string; change: string; autoPick: string; capReached: string; marker: (n: number, label: string) => string; remove: string }
  onFile: (file: File) => void
  onAdd: (x01: number, y01: number) => void
  onMove: (id: string, x01: number, y01: number) => void
  onSelect: (id: string | null) => void
  onRemove: (id: string) => void
  onAutoPick: () => void
  onChangePhoto: () => void
}

interface Box { left: number; top: number; width: number; height: number }

function fitBox(imgW: number, imgH: number, paneW: number, paneH: number): Box {
  const scale = Math.min(paneW / imgW, paneH / imgH)
  const width = Math.max(1, Math.floor(imgW * scale))
  const height = Math.max(1, Math.floor(imgH * scale))
  return { left: Math.floor((paneW - width) / 2), top: Math.floor((paneH - height) / 2), width, height }
}

const LOUPE_ZOOM = 4
const LOUPE_SRC = 20 // analysis pixels shown in the loupe

export function PhotoPane(p: PhotoPaneProps) {
  const paneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loupeRef = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState<Box>({ left: 0, top: 0, width: 1, height: 1 })
  const [loupe, setLoupe] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null)

  // Fit the photo into the pane and redraw on resize
  useEffect(() => {
    const pane = paneRef.current
    if (!pane || !p.photo) return
    if (typeof ResizeObserver === 'undefined') {
      const r = pane.getBoundingClientRect()
      setBox(fitBox(p.photo.width, p.photo.height, r.width, r.height))
      return
    }
    const ro = new ResizeObserver(() => {
      const r = pane.getBoundingClientRect()
      setBox(fitBox(p.photo!.width, p.photo!.height, r.width, r.height))
    })
    ro.observe(pane)
    return () => ro.disconnect()
  }, [p.photo])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !p.photo) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = box.width * dpr; canvas.height = box.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(p.photo.canvas, 0, 0, canvas.width, canvas.height)
  }, [p.photo, box])

  const toImage01 = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    }
  }, [])

  const drawLoupe = useCallback((x01: number, y01: number) => {
    const src = p.photo, lc = loupeRef.current
    if (!src || !lc) return
    const size = LOUPE_SRC * LOUPE_ZOOM
    lc.width = size; lc.height = size
    const ctx = lc.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(src.canvas, x01 * src.width - LOUPE_SRC / 2, y01 * src.height - LOUPE_SRC / 2, LOUPE_SRC, LOUPE_SRC, 0, 0, size, size)
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1
    ctx.strokeRect(size / 2 - LOUPE_ZOOM * 2.5, size / 2 - LOUPE_ZOOM * 2.5, LOUPE_ZOOM * 5, LOUPE_ZOOM * 5)
  }, [p.photo])

  const onCanvasClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) return
    if (!p.canAdd) return
    const { x, y } = toImage01(e.clientX, e.clientY)
    p.onAdd(x, y)
  }, [p, toImage01])

  const onPaneMove = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      const { x, y } = toImage01(e.clientX, e.clientY)
      p.onMove(dragRef.current.id, x, y)
      return
    }
    if (e.pointerType === 'mouse' && e.target === canvasRef.current) {
      const { x, y } = toImage01(e.clientX, e.clientY)
      setLoupe({ x: e.clientX, y: e.clientY })
      drawLoupe(x, y)
    }
  }, [p, toImage01, drawLoupe])

  const onMarkerDragStart = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault()
    dragRef.current = { id, pointerId: e.pointerId }
    paneRef.current?.setPointerCapture(e.pointerId)
    p.onSelect(id)
  }, [p])

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      paneRef.current?.releasePointerCapture(dragRef.current.pointerId)
      // defer so the click that follows pointerup does not add a new sample
      setTimeout(() => { dragRef.current = null }, 0)
    }
    if (e.pointerType === 'mouse') setLoupe(null)
  }, [])

  if (!p.photo) {
    return (
      <div className={styles.pane} ref={paneRef}>
        <div className={styles.dropWrap}>
          <FileDropZone onFile={p.onFile} prompt={p.labels.drop} />
          {p.decodeFailed && <p className={styles.decodeError} role="alert">{p.labels.decodeError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pane} ref={paneRef}
      onPointerMove={onPaneMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={() => setLoupe(null)}>
      <div className={styles.imageBox} style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
        <canvas ref={canvasRef} className={styles.image} style={{ width: box.width, height: box.height }}
          onClick={onCanvasClick} aria-label={p.labels.canvasLabel} />
        <SampleMarkers samples={p.samples} selectedId={p.selectedId} width={box.width} height={box.height}
          markerLabel={p.labels.marker} removeLabel={p.labels.remove}
          onSelect={p.onSelect} onRemove={p.onRemove} onDragStart={onMarkerDragStart} />
      </div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolBtn} onClick={p.onAutoPick}>{p.labels.autoPick}</button>
        <button type="button" className={styles.toolBtnGhost} onClick={p.onChangePhoto}>{p.labels.change}</button>
        {!p.canAdd && <span className={styles.capNote}>{p.labels.capReached}</span>}
      </div>
      {loupe && (
        <div className={styles.loupe} style={{ left: loupe.x + 24, top: loupe.y - 100 }}>
          <canvas ref={loupeRef} style={{ width: 80, height: 80, imageRendering: 'pixelated' }} />
        </div>
      )}
    </div>
  )
}
