import type { ToolEducationSkeleton } from './types'

export const COLOR_SCHEME_SKELETON: ToolEducationSkeleton = {
  slug: 'color-analyzer',
  deeperSections: 6,
  keyFactorCount: 4,
  tipCount: 3,
  tooltipKeys: ['Harmony Type', 'Key Color', 'Hue', 'Saturation', 'Lightness', 'Split Angle', 'Spread'],
  challenges: [
    {
      id: 'ch-beginner-1',
      difficulty: 'beginner',
      targetField: 'harmonyType',
      optionValues: ['complementary', 'analogous', 'triadic'],
      correctOption: 'complementary',
    },
    {
      id: 'ch-beginner-2',
      difficulty: 'beginner',
      targetField: 'harmonyType',
      optionValues: ['complementary', 'analogous', 'tetradic'],
      correctOption: 'analogous',
    },
    {
      id: 'ch-intermediate-1',
      difficulty: 'intermediate',
      targetField: 'harmonyType',
      optionValues: ['split-complementary', 'triadic', 'analogous'],
      correctOption: 'split-complementary',
    },
    {
      id: 'ch-intermediate-2',
      difficulty: 'intermediate',
      targetField: 'complementColor',
      optionValues: ['blue', 'green', 'red'],
      correctOption: 'blue',
    },
    {
      id: 'ch-advanced-1',
      difficulty: 'advanced',
      targetField: 'harmonyType',
      optionValues: ['tetradic', 'triadic', 'analogous'],
      correctOption: 'tetradic',
    },
  ],
}

export const FOV_SIMULATOR_SKELETON: ToolEducationSkeleton = {
  slug: 'fov-simulator',
  deeperSections: 3,
  keyFactorCount: 4,
  tipCount: 3,
  tooltipKeys: ['Focal Length', 'Sensor', 'Scene', 'Orientation'],
  challenges: [
    {
      id: 'fov-beginner-1',
      difficulty: 'beginner',
      targetField: 'focalLength',
      optionValues: ['24', '70', '200'],
      correctOption: '24',
    },
    {
      id: 'fov-beginner-2',
      difficulty: 'beginner',
      targetField: 'fovType',
      optionValues: ['ultrawide', 'normal', 'telephoto'],
      correctOption: 'normal',
    },
    {
      id: 'fov-intermediate-1',
      difficulty: 'intermediate',
      targetField: 'observation',
      optionValues: ['same', 'wider', 'narrower'],
      correctOption: 'same',
    },
    {
      id: 'fov-intermediate-2',
      difficulty: 'intermediate',
      targetField: 'sensor',
      optionValues: ['ff', 'apsc', 'same'],
      correctOption: 'ff',
    },
    {
      id: 'fov-advanced-1',
      difficulty: 'advanced',
      targetField: 'analysis',
      optionValues: ['correct', 'identical', 'no-effect'],
      correctOption: 'correct',
    },
  ],
}
