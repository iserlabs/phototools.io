interface FaqSkeleton {
  id: string
}

interface ToolFaqs {
  slug: string
  questions: FaqSkeleton[]
}

export const TOOL_FAQS: ToolFaqs[] = [
  {
    slug: 'fov-simulator',
    questions: [
      { id: 'what-is-fov' },
      { id: 'how-crop-factor-affects-fov' },
      { id: 'fov-vs-focal-length' },
    ],
  },
  {
    slug: 'color-scheme-generator',
    questions: [
      { id: 'what-is-color-harmony' },
      { id: 'complementary-vs-analogous' },
      { id: 'how-to-use-color-schemes-photography' },
    ],
  },
  {
    slug: 'star-trail-calculator',
    questions: [
      { id: 'what-is-500-rule' },
      { id: 'star-trails-vs-points' },
      { id: 'best-settings-milky-way' },
    ],
  },
  {
    slug: 'white-balance-visualizer',
    questions: [
      { id: 'what-is-white-balance' },
      { id: 'kelvin-vs-presets' },
      { id: 'when-to-use-manual-white-balance' },
    ],
  },
  {
    slug: 'sensor-size-comparison',
    questions: [
      { id: 'what-is-crop-factor' },
      { id: 'full-frame-vs-aps-c' },
      { id: 'sensor-size-and-depth-of-field' },
    ],
  },
  {
    slug: 'frame-studio',
    questions: [
      { id: 'what-is-rule-of-thirds' },
      { id: 'best-aspect-ratio-for-instagram' },
      { id: 'how-to-use-golden-ratio' },
    ],
  },
  {
    slug: 'exif-viewer',
    questions: [
      { id: 'what-is-exif-data' },
      { id: 'how-to-read-histogram' },
      { id: 'does-exif-contain-location' },
    ],
  },
  {
    slug: 'megapixels-size-visualizer',
    questions: [
      { id: 'how-many-megapixels-for-large-print' },
      { id: 'why-phone-48mp-shows-12mp' },
      { id: 'difference-300-dpi-vs-240-dpi' },
    ],
  },
  {
    slug: 'shutter-count-checker',
    questions: [
      { id: 'what-is-shutter-count' },
      { id: 'how-many-actuations-is-too-many' },
      { id: 'why-no-canon-sony-shutter-count' },
    ],
  },
  {
    slug: 'camera-health-checker',
    questions: [
      { id: 'what-to-check-buying-used-camera' },
      { id: 'where-does-health-data-come-from' },
      { id: 'is-my-photo-uploaded' },
    ],
  },
  {
    slug: 'panorama-calculator',
    questions: [
      { id: 'how-much-overlap-for-panorama' },
      { id: 'why-shoot-panorama-vertical' },
      { id: 'what-is-nodal-point' },
    ],
  },
  {
    slug: 'diffraction-calculator',
    questions: [
      { id: 'what-is-diffraction-in-photography' },
      { id: 'what-aperture-is-sharpest' },
      { id: 'does-diffraction-depend-on-sensor' },
    ],
  },
  {
    slug: 'photography-cheat-sheet',
    questions: [
      { id: 'what-settings-for-portraits' },
      { id: 'what-settings-for-milky-way' },
      { id: 'are-cheat-sheet-settings-exact' },
    ],
  },
  {
    slug: 'focus-stacking-calculator',
    questions: [
      { id: 'what-is-focus-stacking' },
      { id: 'how-much-overlap' },
      { id: 'best-aperture-for-stacking' },
      { id: 'stacking-vs-hyperfocal' },
      { id: 'what-is-a-rail-step' },
      { id: 'what-software-merges-stacks' },
    ],
  },
]

export function getFaqsBySlug(slug: string): ToolFaqs | undefined {
  return TOOL_FAQS.find((f) => f.slug === slug)
}
