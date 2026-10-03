'use client'
// TEMPORARY — proof-loop canary B for the hub's Sentry auto-fix (browser-only). Remove after the proof.
// Deliberate bug: the WebGL extension below does not exist, so getExtension() returns null in a real
// browser; the cast hides it from tsc. jsdom has no WebGL context at all, so the bug never runs there.
import { useEffect, useRef, useState } from 'react'

type CanaryExtension = { maxCanarySamples: number }

export function GpuProbe() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [label, setLabel] = useState('probing…')

  useEffect(() => {
    const gl = canvas.current?.getContext('webgl2')
    if (!gl) {
      setLabel('WebGL2 unavailable')
      return
    }
    const ext = gl.getExtension('WEBGL_iserlabs_canary_probe') as unknown as CanaryExtension
    setLabel(`samples: ${ext.maxCanarySamples}`)
  }, [])

  return (
    <div>
      <canvas ref={canvas} width={1} height={1} hidden />
      <p>{label}</p>
    </div>
  )
}
