import type { ToolEducationSkeleton } from './types'

export const EQUIVALENT_SETTINGS_SKELETON: ToolEducationSkeleton = {
  slug: 'equivalent-settings-calculator',
  deeperSections: 3,
  keyFactorCount: 3,
  tipCount: 3,
  tooltipKeys: ['sourceSensor', 'sourceFocalLength', 'sourceAperture', 'targetSensor', 'cropFactor', 'equivalentFL', 'equivalentAperture'],
  challenges: [
    {
      id: 'equiv-ff-to-apsc',
      difficulty: 'beginner',
      targetField: 'equivalentFL',
      optionValues: ['50mm', '56mm', '75mm', '85mm'],
      correctOption: '50mm',
    },
    {
      id: 'equiv-aperture-myth',
      difficulty: 'intermediate',
      targetField: 'equivalentAperture',
      optionValues: ['Same — f/1.4', 'f/2.1', 'f/0.9 (impossible)'],
      correctOption: 'f/2.1',
    },
    {
      id: 'equiv-same-perspective',
      difficulty: 'advanced',
      targetField: 'perspective',
      optionValues: ['Changes with sensor', 'Only depends on distance', 'Changes with focal length'],
      correctOption: 'Only depends on distance',
    },
  ],
}
