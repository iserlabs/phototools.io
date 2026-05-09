interface WbPreset {
  name: string
  kelvin: number
}

export const WB_PRESETS: WbPreset[] = [
  { name: 'Candle', kelvin: 1900 },
  { name: 'Tungsten', kelvin: 2700 },
  { name: 'Fluorescent', kelvin: 4000 },
  { name: 'Daylight', kelvin: 5500 },
  { name: 'Flash', kelvin: 5600 },
  { name: 'Cloudy', kelvin: 6500 },
  { name: 'Shade', kelvin: 7500 },
  { name: 'Blue Sky', kelvin: 10000 },
]

interface WbScene {
  id: string
  label: string
  src: string
}

export const WB_SCENES: WbScene[] = [
  { id: 'landscape', label: 'Landscape', src: '/images/scenes/landscape.jpg' },
  { id: 'cityscape', label: 'Cityscape', src: '/images/scenes/cityscape.jpg' },
  { id: 'street', label: 'Street', src: '/images/scenes/street.jpg' },
  { id: 'wildlife', label: 'Wildlife', src: '/images/scenes/wildlife.jpg' },
]
