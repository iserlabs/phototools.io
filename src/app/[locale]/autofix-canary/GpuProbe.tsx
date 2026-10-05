'use client'
// TEMPORARY — proof-loop canary B for the hub's Sentry auto-fix (browser-only). Remove after the proof.
// getExtension() returns null for any extension the GPU/driver does not expose (this one exists
// nowhere), so the result has to be feature-detected rather than assumed to be an object.
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
    const ext = gl.getExtension('WEBGL_iserlabs_canary_probe') as CanaryExtension | null
    setLabel(ext ? `samples: ${ext.maxCanarySamples}` : 'probe extension unsupported')
  }, [])

  return (
    <div>
      <canvas ref={canvas} width={1} height={1} hidden />
      <p>{label}</p>
    </div>
  )
}
