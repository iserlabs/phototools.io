/** Live handle to a WebGL2 context plus the canvas it was created from. */
export interface GlHandle {
  gl: WebGL2RenderingContext
  canvas: HTMLCanvasElement
  lost: boolean
}

const QUAD_POSITIONS = new Float32Array([
  -1, -1, 1, -1, -1, 1,
  -1, 1, 1, -1, 1, 1,
])

/**
 * Creates a WebGL2 context and binds the full-screen clip-space quad (2
 * triangles) to attribute location 0 — matches `aPos` in passthrough.vert.ts.
 * Returns null when WebGL2 is unavailable (caller falls back to a static image).
 */
export function createGl(canvas: HTMLCanvasElement): GlHandle | null {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false })
  if (!gl) return null

  const quadBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_POSITIONS, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  return { gl, canvas, lost: false }
}

/**
 * Wires up context-loss recovery: preventDefault on 'webglcontextlost' so the
 * browser fires the matching 'webglcontextrestored' (mirrors the
 * perspective-compression-simulator pattern), flips `h.lost`, and notifies the
 * caller so it can drop/rebuild GPU resources. Returns a cleanup function.
 */
export function attachLossHandlers(h: GlHandle, onLost: () => void, onRestored: () => void): () => void {
  const handleLost = (e: Event) => {
    e.preventDefault()
    h.lost = true
    onLost()
  }
  const handleRestored = () => {
    h.lost = false
    onRestored()
  }
  h.canvas.addEventListener('webglcontextlost', handleLost)
  h.canvas.addEventListener('webglcontextrestored', handleRestored)
  return () => {
    h.canvas.removeEventListener('webglcontextlost', handleLost)
    h.canvas.removeEventListener('webglcontextrestored', handleRestored)
  }
}

/** Sizes the canvas's CSS box and backing store, clamping DPR to 2 for perf. */
export function sizeCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`
  canvas.width = Math.max(1, Math.round(cssW * dpr))
  canvas.height = Math.max(1, Math.round(cssH * dpr))
}
