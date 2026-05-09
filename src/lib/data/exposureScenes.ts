interface ExposureScene {
  id: string
  labelKey: string
  assets: {
    photo: string
    depthMap: string
    motionMask: string
  }
}

export const EXPOSURE_SCENES: ExposureScene[] = [
  {
    id: 'street',
    labelKey: 'sceneStreet',
    assets: {
      photo: '/images/exposure-simulator/street.jpg',
      depthMap: '/images/exposure-simulator/street-depth.png',
      motionMask: '/images/exposure-simulator/street-motion.png',
    },
  },
  {
    id: 'landscape',
    labelKey: 'sceneLandscape',
    assets: {
      photo: '/images/exposure-simulator/landscape.jpg',
      depthMap: '/images/exposure-simulator/landscape-depth.png',
      motionMask: '/images/exposure-simulator/landscape-motion.png',
    },
  },
  {
    id: 'portrait',
    labelKey: 'scenePortrait',
    assets: {
      photo: '/images/exposure-simulator/portrait.jpg',
      depthMap: '/images/exposure-simulator/portrait-depth.png',
      motionMask: '/images/exposure-simulator/portrait-motion.png',
    },
  },
  {
    id: 'lowlight',
    labelKey: 'sceneLowLight',
    assets: {
      photo: '/images/exposure-simulator/lowlight.jpg',
      depthMap: '/images/exposure-simulator/lowlight-depth.png',
      motionMask: '/images/exposure-simulator/lowlight-motion.png',
    },
  },
]
