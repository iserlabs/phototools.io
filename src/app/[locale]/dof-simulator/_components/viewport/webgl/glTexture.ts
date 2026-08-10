import type { Tap } from '@/lib/math/bokehKernel'

/** Loads an image URL into an RGBA mipmapped texture. Rejects on load failure. */
export function loadTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const texture = gl.createTexture()
      if (!texture) { reject(new Error('Failed to create texture')); return }
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      resolve(texture)
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

/** Flattens taps into an xy-interleaved buffer for uniform2fv array upload. */
export function packTaps(taps: Tap[]): Float32Array {
  const out = new Float32Array(taps.length * 2)
  for (let i = 0; i < taps.length; i++) {
    out[i * 2] = taps[i].x
    out[i * 2 + 1] = taps[i].y
  }
  return out
}

/**
 * Center-crop rect mapping an overscan texture (rendered at `texAspect`) onto a
 * view of `viewAspect`, so the blur never samples outside the rendered frame.
 * Returns [offX, offY, scaleX, scaleY] in UV space (0..1).
 */
export function uvRectForAspect(texAspect: number, viewAspect: number): [number, number, number, number] {
  if (texAspect > viewAspect) {
    const scaleX = viewAspect / texAspect
    return [(1 - scaleX) / 2, 0, scaleX, 1]
  }
  if (texAspect < viewAspect) {
    const scaleY = texAspect / viewAspect
    return [0, (1 - scaleY) / 2, 1, scaleY]
  }
  return [0, 0, 1, 1]
}
