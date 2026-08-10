import type { ToolEducationSkeleton } from './types'

export const DOF_CALCULATOR_SKELETON: ToolEducationSkeleton = {
  slug: 'dof-simulator',
  deeperSections: 3,
  keyFactorCount: 4,
  tipCount: 3,
  tooltipKeys: ['focalLength', 'aperture', 'subjectDistance', 'sensor', 'hyperfocal', 'coc', 'backgroundBlur', 'diffractionWarning'],
  challenges: [
    {
      id: 'dof-c1',
      difficulty: 'beginner',
      targetField: 'aperture',
      optionValues: ['f1.4', 'f5.6', 'f11', 'f16'],
      correctOption: 'f1.4',
    },
    {
      id: 'dof-c2',
      difficulty: 'beginner',
      targetField: 'aperture',
      optionValues: ['f1.4', 'f2.8', 'f5.6', 'f16'],
      correctOption: 'f5.6',
    },
    {
      id: 'dof-c3',
      difficulty: 'intermediate',
      targetField: 'distance',
      optionValues: ['halveDistance', 'doubleDistance', 'stepBack', 'raiseISO'],
      correctOption: 'halveDistance',
    },
    {
      id: 'dof-c4',
      difficulty: 'intermediate',
      targetField: 'aperture',
      optionValues: ['f22Always', 'sweetSpot', 'wideOpen', 'sameEverywhere'],
      correctOption: 'sweetSpot',
    },
    {
      id: 'dof-c5',
      difficulty: 'advanced',
      targetField: 'sensor',
      optionValues: ['fullFrame', 'apsc', 'same'],
      correctOption: 'fullFrame',
    },
  ],
}
