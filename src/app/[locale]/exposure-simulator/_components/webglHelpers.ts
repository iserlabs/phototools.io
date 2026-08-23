export interface GLResources {
  gl: WebGL2RenderingContext
  dofProgram: WebGLProgram
  motionProgram: WebGLProgram
  noiseProgram: WebGLProgram
  vao: WebGLVertexArrayObject
  framebufferA: WebGLFramebuffer | null
  framebufferB: WebGLFramebuffer | null
  textureA: WebGLTexture | null
  textureB: WebGLTexture | null
  photoTexture: WebGLTexture | null
  depthTexture: WebGLTexture | null
  motionTexture: WebGLTexture | null
  width: number
  height: number
}

// `null` return = recoverable, environmental failure (the WebGL context was
// lost — e.g. Safari recycling the GPU process; gl.createShader/createProgram
// return null and COMPILE/LINK_STATUS read false with a null info log). The
// caller should fall back to the static scene image. A thrown error = a genuine
// GLSL compile/link bug on a live context, which is actionable and worth
// reporting (Sentry PHOTOTOOLS-W; mirrors compressionGeometry.ts).
function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null // context lost (or OOM) — not a bug we can fix in code
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    if (gl.isContextLost()) return null
    throw new Error(`Shader compile error: ${info}`)
  }
  return shader
}

export function createProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  if (!vert || !frag) {
    if (vert) gl.deleteShader(vert)
    if (frag) gl.deleteShader(frag)
    return null
  }
  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vert)
    gl.deleteShader(frag)
    return null
  }
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  gl.deleteShader(vert)
  gl.deleteShader(frag)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    if (gl.isContextLost()) return null
    throw new Error(`Program link error: ${info}`)
  }
  return program
}

export function createFramebuffer(gl: WebGL2RenderingContext, width: number, height: number): { fb: WebGLFramebuffer; tex: WebGLTexture } {
  const tex = gl.createTexture()
  if (!tex) throw new Error('Failed to create texture')
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  const fb = gl.createFramebuffer()
  if (!fb) throw new Error('Failed to create framebuffer')
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { fb, tex }
}

export function loadImageAsTexture(gl: WebGL2RenderingContext, src: string): Promise<{ texture: WebGLTexture; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const texture = gl.createTexture()
      if (!texture) { reject(new Error('Failed to create texture')); return }
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      resolve({ texture, width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

export function setupFullScreenQuad(gl: WebGL2RenderingContext, program: WebGLProgram): WebGLVertexArrayObject | null {
  const vao = gl.createVertexArray()
  if (!vao) return null // context lost — caller falls back to the static image
  gl.bindVertexArray(vao)

  const positions = new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1,
  ])
  const texCoords = new Float32Array([
    0, 0,  1, 0,  0, 1,
    0, 1,  1, 0,  1, 1,
  ])

  const posBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
  const posLoc = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  const texBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, texBuf)
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)
  const texLoc = gl.getAttribLocation(program, 'a_texCoord')
  gl.enableVertexAttribArray(texLoc)
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0)

  gl.bindVertexArray(null)
  return vao
}
