'use client'

import { useCallback, useState } from 'react'
import { DOF_SUBJECTS } from '@/lib/data/dofSimulator/models'
import { DOF_BACKGROUNDS } from '@/lib/data/dofSimulator/backgrounds'

export interface AppearanceApi {
  subjectId: string
  backgroundId: string
  orientation: 'landscape' | 'portrait'
  setSubjectId(v: string): void
  setBackgroundId(v: string): void
  setOrientation(v: 'landscape' | 'portrait'): void
}

export function useAppearance(): AppearanceApi {
  const [subjectId, setSubjectId] = useState<string>(DOF_SUBJECTS[0].id)
  const [backgroundId, setBackgroundId] = useState<string>(DOF_BACKGROUNDS[0].id)
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')

  return {
    subjectId,
    backgroundId,
    orientation,
    setSubjectId: useCallback((v: string) => setSubjectId(v), []),
    setBackgroundId: useCallback((v: string) => setBackgroundId(v), []),
    setOrientation: useCallback((v: 'landscape' | 'portrait') => setOrientation(v), []),
  }
}
