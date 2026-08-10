import type { DofSubject, SubjectCrop } from './types'
import type { CropLevel } from '@/lib/math/projection'

interface SubjectRow {
  id: string
  name: string
  heightM: number
  eyeLine: Record<CropLevel, number>
}

// eyeLineRatio values are visually measured (eye Y / crop height) from the
// generated portraits.
const ROWS: SubjectRow[] = [
  { id: 'woman-a', name: 'Woman A', heightM: 1.70, eyeLine: { full: 0.19, torso: 0.24, face: 0.345 } },
  { id: 'man-a', name: 'Man A', heightM: 1.85, eyeLine: { full: 0.18, torso: 0.22, face: 0.325 } },
  { id: 'woman-b', name: 'Woman B', heightM: 1.60, eyeLine: { full: 0.19, torso: 0.25, face: 0.32 } },
  { id: 'man-b', name: 'Man B', heightM: 1.75, eyeLine: { full: 0.18, torso: 0.23, face: 0.31 } },
  { id: 'girl-a', name: 'Girl A', heightM: 1.15, eyeLine: { full: 0.21, torso: 0.28, face: 0.355 } },
  { id: 'boy-a', name: 'Boy A', heightM: 1.30, eyeLine: { full: 0.20, torso: 0.26, face: 0.34 } },
  { id: 'teen-a', name: 'Teen A', heightM: 1.45, eyeLine: { full: 0.19, torso: 0.24, face: 0.33 } },
  { id: 'man-c', name: 'Man C', heightM: 1.90, eyeLine: { full: 0.19, torso: 0.23, face: 0.33 } },
]

function buildCrop(id: string, level: CropLevel, eyeLineRatio: number): SubjectCrop {
  const base = `/dof/subjects/${id}`
  const src = `${base}/${level}.webp`
  const slices =
    level === 'full'
      ? [{ src, depthOffsetMm: 0 }]
      : level === 'torso'
        ? [
            { src: `${base}/torso-near.webp`, depthOffsetMm: 0 },
            { src: `${base}/torso-far.webp`, depthOffsetMm: 120 },
          ]
        : [
            { src: `${base}/face-near.webp`, depthOffsetMm: -40 },
            { src: `${base}/face-mid.webp`, depthOffsetMm: 0 },
            { src: `${base}/face-far.webp`, depthOffsetMm: 90 },
          ]
  return { src, eyeLineRatio, slices }
}

export const DOF_SUBJECTS: DofSubject[] = ROWS.map((r) => ({
  id: r.id,
  name: r.name,
  heightM: r.heightM,
  crops: {
    full: buildCrop(r.id, 'full', r.eyeLine.full),
    torso: buildCrop(r.id, 'torso', r.eyeLine.torso),
    face: buildCrop(r.id, 'face', r.eyeLine.face),
  },
}))

export function getSubjectById(id: string): DofSubject {
  return DOF_SUBJECTS.find((s) => s.id === id) ?? DOF_SUBJECTS[0]
}
