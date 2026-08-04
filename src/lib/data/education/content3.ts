import type { ToolEducationSkeleton } from './types'

/** Education skeletons for the 2026-08 tool batch (see docs/superpowers/specs/2026-08-04-four-new-tools-design.md). */
export const TOOL_EDUCATION_SKELETONS_3: ToolEducationSkeleton[] = [
  {
    slug: 'shutter-count-checker',
    keyFactorCount: 3,
    tipCount: 3,
    tooltipKeys: ['shutterCount', 'ratedLife', 'source'],
    challenges: [
      {
        id: 'scc-what-counts',
        difficulty: 'beginner',
        targetField: 'shutterCount',
        optionValues: ['every-photo', 'mechanical-only', 'raw-only', 'flash-only'],
        correctOption: 'mechanical-only',
      },
      {
        id: 'scc-rated-life',
        difficulty: 'intermediate',
        targetField: 'ratedLife',
        optionValues: ['hard-limit', 'average-lifespan', 'warranty-length', 'battery-cycles'],
        correctOption: 'average-lifespan',
      },
      {
        id: 'scc-buying-used',
        difficulty: 'intermediate',
        targetField: 'shutterCount',
        optionValues: ['count-only', 'price-only', 'count-plus-condition', 'age-only'],
        correctOption: 'count-plus-condition',
      },
    ],
  },
  {
    slug: 'camera-health-checker',
    keyFactorCount: 3,
    tipCount: 3,
    tooltipKeys: ['serialNumber', 'firmware', 'bodyAge'],
    challenges: [
      {
        id: 'chc-serial',
        difficulty: 'beginner',
        targetField: 'serialNumber',
        optionValues: ['stolen-check', 'photo-quality', 'lens-compatibility', 'iso-range'],
        correctOption: 'stolen-check',
      },
      {
        id: 'chc-firmware',
        difficulty: 'intermediate',
        targetField: 'firmware',
        optionValues: ['new-features', 'more-megapixels', 'bigger-sensor', 'nothing'],
        correctOption: 'new-features',
      },
      {
        id: 'chc-age',
        difficulty: 'intermediate',
        targetField: 'bodyAge',
        optionValues: ['age-alone', 'shutter-and-condition', 'megapixels-only', 'brand-only'],
        correctOption: 'shutter-and-condition',
      },
    ],
  },
  {
    slug: 'panorama-calculator',
    keyFactorCount: 4,
    tipCount: 3,
    tooltipKeys: ['overlap', 'orientation', 'rotateBetween', 'rows'],
    challenges: [
      {
        id: 'pano-overlap',
        difficulty: 'beginner',
        targetField: 'overlap',
        optionValues: ['5', '15', '30', '80'],
        correctOption: '30',
      },
      {
        id: 'pano-orientation',
        difficulty: 'beginner',
        targetField: 'orientation',
        optionValues: ['landscape', 'portrait', 'square', 'tilted'],
        correctOption: 'portrait',
      },
      {
        id: 'pano-frames',
        difficulty: 'intermediate',
        targetField: 'frames',
        optionValues: ['4', '7', '13', '20'],
        correctOption: '7',
      },
      {
        id: 'pano-parallax',
        difficulty: 'advanced',
        targetField: 'nodal',
        optionValues: ['lens-front', 'nodal-point', 'sensor-plane', 'tripod-socket'],
        correctOption: 'nodal-point',
      },
    ],
  },
  {
    slug: 'diffraction-calculator',
    keyFactorCount: 3,
    tipCount: 3,
    tooltipKeys: ['pixelPitch', 'airyDisk', 'diffractionLimit'],
    challenges: [
      {
        id: 'diff-cause',
        difficulty: 'beginner',
        targetField: 'aperture',
        optionValues: ['lens-quality', 'light-bending', 'sensor-heat', 'iso-noise'],
        correctOption: 'light-bending',
      },
      {
        id: 'diff-mp',
        difficulty: 'intermediate',
        targetField: 'megapixels',
        optionValues: ['higher-limit', 'lower-limit', 'no-change', 'always-sharper'],
        correctOption: 'lower-limit',
      },
      {
        id: 'diff-landscape',
        difficulty: 'intermediate',
        targetField: 'aperture',
        optionValues: ['f22-always', 'f8-f11', 'wide-open', 'depends-on-iso'],
        correctOption: 'f8-f11',
      },
    ],
  },
  {
    slug: 'photography-cheat-sheet',
    keyFactorCount: 3,
    tipCount: 3,
    tooltipKeys: ['aperture', 'shutter', 'iso'],
    challenges: [
      {
        id: 'cheat-portrait',
        difficulty: 'beginner',
        targetField: 'scenario',
        optionValues: ['narrow-aperture', 'wide-aperture', 'long-exposure', 'high-iso'],
        correctOption: 'wide-aperture',
      },
      {
        id: 'cheat-wildlife',
        difficulty: 'beginner',
        targetField: 'scenario',
        optionValues: ['slow-shutter', 'fast-shutter', 'f22', 'tungsten-wb'],
        correctOption: 'fast-shutter',
      },
      {
        id: 'cheat-milkyway',
        difficulty: 'intermediate',
        targetField: 'scenario',
        optionValues: ['f11-30s-iso100', 'wide-open-high-iso', 'f8-fast-shutter', 'nd-filter'],
        correctOption: 'wide-open-high-iso',
      },
    ],
  },
]
