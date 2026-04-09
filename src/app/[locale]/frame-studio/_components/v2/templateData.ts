export interface TemplateDefinition {
  id: string
  nameKey: string
  width: number
  height: number
  aspectLabel: string
  platform: string
}

export const TEMPLATES: TemplateDefinition[] = [
  { id: 'ig-story',    nameKey: 'storyTemplate',     width: 1080, height: 1920, aspectLabel: '9:16',  platform: 'Instagram' },
  { id: 'ig-post',     nameKey: 'postTemplate',       width: 1080, height: 1350, aspectLabel: '4:5',   platform: 'Instagram' },
  { id: 'ig-square',   nameKey: 'squareTemplate',     width: 1080, height: 1080, aspectLabel: '1:1',   platform: 'Instagram' },
  { id: 'pinterest',   nameKey: 'pinterestTemplate',  width: 1000, height: 1500, aspectLabel: '2:3',   platform: 'Pinterest' },
  { id: 'og-image',    nameKey: 'ogTemplate',         width: 1200, height: 630,  aspectLabel: '1.9:1', platform: 'Social' },
]
