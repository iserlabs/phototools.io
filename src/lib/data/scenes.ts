export interface Scene {
  id: string
  name: string
  src: string
}

export const SCENES: Scene[] = [
  { id: 'landscape', name: 'Landscape', src: '/images/scenes/landscape.jpg' },
  { id: 'cityscape', name: 'Cityscape', src: '/images/scenes/cityscape.jpg' },
  { id: 'street', name: 'Street', src: '/images/scenes/street.jpg' },
  { id: 'wildlife', name: 'Wildlife', src: '/images/scenes/wildlife.jpg' },
]
