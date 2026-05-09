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
]

export function getFaqsBySlug(slug: string): ToolFaqs | undefined {
  return TOOL_FAQS.find((f) => f.slug === slug)
}
