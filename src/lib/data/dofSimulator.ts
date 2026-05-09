export interface DofScene {
  key: string
  name: string
  photo: string
  depthMap: string
  nearDistance: number
  farDistance: number
  defaultSubjectDistance: number
}

export const DOF_SCENES: DofScene[] = [
  { key: 'park-portrait', name: 'Park Portrait', photo: '/scenes/park-portrait.jpg', depthMap: '/scenes/park-portrait-depth.png', nearDistance: 2, farDistance: 50, defaultSubjectDistance: 3 },
  { key: 'street', name: 'Urban Street', photo: '/scenes/street.jpg', depthMap: '/scenes/street-depth.png', nearDistance: 3, farDistance: 200, defaultSubjectDistance: 5 },
  { key: 'landscape', name: 'Landscape', photo: '/scenes/landscape.jpg', depthMap: '/scenes/landscape-depth.png', nearDistance: 0.5, farDistance: 1000, defaultSubjectDistance: 10 },
  { key: 'cafe', name: 'Indoor Café', photo: '/scenes/cafe.jpg', depthMap: '/scenes/cafe-depth.png', nearDistance: 1, farDistance: 15, defaultSubjectDistance: 2 },
  { key: 'architecture', name: 'Architecture', photo: '/scenes/architecture.jpg', depthMap: '/scenes/architecture-depth.png', nearDistance: 5, farDistance: 100, defaultSubjectDistance: 15 },
  { key: 'macro', name: 'Macro', photo: '/scenes/macro.jpg', depthMap: '/scenes/macro-depth.png', nearDistance: 0.1, farDistance: 2, defaultSubjectDistance: 0.3 },
]

export type DofSceneKey = typeof DOF_SCENES[number]['key']

export function getDofScene(key: string): DofScene {
  return DOF_SCENES.find((sc) => sc.key === key) ?? DOF_SCENES[0]
}

export type SubjectMode = 'figure' | 'target'
export type ABMode = 'off' | 'wipe' | 'split'
export type BokehShape = 'disc' | 'blade5' | 'blade6' | 'blade7' | 'blade8' | 'blade9' | 'cata'

export const BOKEH_SHAPES: { key: BokehShape; name: string }[] = [
  { key: 'disc', name: 'Circular' },
  { key: 'blade5', name: '5 Blades' },
  { key: 'blade6', name: '6 Blades' },
  { key: 'blade7', name: '7 Blades' },
  { key: 'blade8', name: '8 Blades' },
  { key: 'blade9', name: '9 Blades' },
  { key: 'cata', name: 'Catadioptric' },
]

export interface FramingPreset {
  key: string
  name: string
  heightMm: number
}

export const FRAMING_PRESETS: FramingPreset[] = [
  { key: 'face', name: 'Face', heightMm: 320 },
  { key: 'portrait', name: 'Portrait', heightMm: 480 },
  { key: 'medium', name: 'Medium', heightMm: 700 },
  { key: 'american', name: 'American', heightMm: 1000 },
  { key: 'full', name: 'Full', heightMm: 1700 },
]

export const FIGURE_DEPTH_ZONES = [
  { key: 'nose', offsetMm: -50, label: 'Nose' },
  { key: 'face', offsetMm: -20, label: 'Face' },
  { key: 'eyes', offsetMm: 0, label: 'Eyes (focus)' },
  { key: 'ears', offsetMm: 70, label: 'Ears' },
  { key: 'body', offsetMm: 100, label: 'Body' },
]

// Backward-compat alias for existing DoF Calculator component (until Task 8 renames it)
import type { SceneKey } from '@/components/shared/DoFCanvas'

export const DOF_SCENE_PRESETS: { key: SceneKey; labelKey: string }[] = [
  { key: 'portrait', labelKey: 'scenePortrait' },
  { key: 'landscape', labelKey: 'sceneLandscape' },
  { key: 'street', labelKey: 'sceneStreet' },
  { key: 'macro', labelKey: 'sceneMacro' },
]
