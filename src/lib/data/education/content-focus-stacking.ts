import type { ToolEducationSkeleton } from './types'

export const FOCUS_STACKING_SKELETON: ToolEducationSkeleton = {
  slug: 'focus-stacking-calculator',
  deeperSections: 4,
  keyFactorCount: 3,
  tipCount: 3,
  tooltipKeys: [
    'focalLength',
    'aperture',
    'sensor',
    'nearLimit',
    'farLimit',
    'overlap',
    'shotCount',
    'magnification',
    'effectiveAperture',
    'railStep',
    'subjectDepth',
  ],
  challenges: [
    {
      id: 'stacking-macro-count',
      difficulty: 'beginner',
      targetField: 'aperture',
      optionValues: ['f/2.8 — 25 shots', 'f/8 — 8 shots', 'f/16 — 4 shots', 'f/22 — 2 shots'],
      correctOption: 'f/8 — 8 shots',
    },
    {
      id: 'stacking-landscape-technique',
      difficulty: 'intermediate',
      targetField: 'focusDistance',
      optionValues: ['f/2.8 — widest for fastest shutter', 'f/8 — lens sweet spot', 'f/22 — maximum per-shot depth of field'],
      correctOption: 'f/8 — lens sweet spot',
    },
    {
      id: 'stacking-overlap-purpose',
      difficulty: 'beginner',
      targetField: 'overlap',
      optionValues: ['Sharper image', 'Alignment tolerance', 'More bokeh', 'Wider field of view'],
      correctOption: 'Alignment tolerance',
    },
    {
      id: 'stacking-effective-aperture',
      difficulty: 'intermediate',
      targetField: 'aperture',
      optionValues: ['f/8', 'f/16', 'f/24', 'f/32'],
      correctOption: 'f/24',
    },
    {
      id: 'stacking-rail-step',
      difficulty: 'advanced',
      targetField: 'overlap',
      optionValues: ['0.1 mm', '0.4 mm', '0.5 mm', '0.6 mm'],
      correctOption: '0.4 mm',
    },
  ],
}
