import { GROUND_COLOR, GRID_COLOR } from './compressionConstants'

export interface GeoArrays {
  positions: number[]
  normals: number[]
  colors: number[]
}

export function buildCylinder(
  cx: number, cz: number, radius: number, height: number,
  segments: number, color: [number, number, number],
): GeoArrays {
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2
    const a1 = ((i + 1) / segments) * Math.PI * 2

    const cos0 = Math.cos(a0), sin0 = Math.sin(a0)
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1)

    const x0 = cx + radius * cos0, z0 = cz + radius * sin0
    const x1 = cx + radius * cos1, z1 = cz + radius * sin1

    positions.push(x0, 0, z0, x1, 0, z1, x0, height, z0)
    positions.push(x0, height, z0, x1, 0, z1, x1, height, z1)

    const nx0 = cos0, nz0 = sin0
    const nx1 = cos1, nz1 = sin1
    for (let t = 0; t < 6; t++) {
      const nx = t < 3 || t === 3 ? nx0 : nx1
      const nz = t < 3 || t === 3 ? nz0 : nz1
      normals.push(nx, 0, nz)
      colors.push(color[0], color[1], color[2])
    }

    positions.push(cx, height, cz, x0, height, z0, x1, height, z1)
    for (let t = 0; t < 3; t++) {
      normals.push(0, 1, 0)
      colors.push(color[0] * 0.8, color[1] * 0.8, color[2] * 0.8)
    }
  }

  return { positions, normals, colors }
}

function buildBox(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, color: [number, number, number]): GeoArrays {
  const p = [
    cx-rx,cy-ry,cz-rz, cx+rx,cy-ry,cz-rz, cx+rx,cy+ry,cz-rz, cx-rx,cy+ry,cz-rz,
    cx-rx,cy-ry,cz+rz, cx+rx,cy-ry,cz+rz, cx+rx,cy+ry,cz+rz, cx-rx,cy+ry,cz+rz
  ]
  const idx = [
    0,1,2, 0,2,3, 4,5,6, 4,6,7, 0,4,7, 0,7,3, 1,5,6, 1,6,2, 0,1,5, 0,5,4, 3,2,6, 3,6,7
  ]
  const ns = [0,0,-1, 0,0,1, -1,0,0, 1,0,0, 0,-1,0, 0,1,0]
  const positions: number[] = [], normals: number[] = [], colors: number[] = []
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const v = idx[i*6+j]
      positions.push(p[v*3], p[v*3+1], p[v*3+2])
      normals.push(ns[i*3], ns[i*3+1], ns[i*3+2])
      colors.push(color[0], color[1], color[2])
    }
  }
  return { positions, normals, colors }
}

export function buildGroundPlaneWithGrid(): GeoArrays {
  const s = 300
  const positions = [
    -s, 0, -s, s, 0, -s, -s, 0, s,
    -s, 0, s, s, 0, -s, s, 0, s,
  ]
  const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
  const colors: number[] = []
  for (let i = 0; i < 6; i++) {
    colors.push(GROUND_COLOR[0], GROUND_COLOR[1], GROUND_COLOR[2])
  }

  const gridSpacing = 15
  const gridRadius = 0.05
  for (let x = -s; x <= s; x += gridSpacing) {
    const line = buildBox(x, 0, 0, gridRadius, 0.01, s, GRID_COLOR)
    positions.push(...line.positions)
    normals.push(...line.normals)
    colors.push(...line.colors)
  }
  for (let z = -s; z <= s; z += gridSpacing) {
    const line = buildBox(0, 0, z, s, 0.01, gridRadius, GRID_COLOR)
    positions.push(...line.positions)
    normals.push(...line.normals)
    colors.push(...line.colors)
  }

  return { positions, normals, colors }
}

export function mergeGeo(...parts: GeoArrays[]): GeoArrays {
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  for (const p of parts) {
    positions.push(...p.positions)
    normals.push(...p.normals)
    colors.push(...p.colors)
  }
  return { positions, normals, colors }
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Failed to create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error: ${info}`)
  }
  return shader
}

export function createProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  const program = gl.createProgram()
  if (!program) throw new Error('Failed to create program')
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.bindAttribLocation(program, 0, 'a_position')
  gl.bindAttribLocation(program, 1, 'a_normal')
  gl.bindAttribLocation(program, 2, 'a_color')
  gl.linkProgram(program)
  gl.deleteShader(vert)
  gl.deleteShader(frag)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Program link error: ${info}`)
  }
  return program
}
