import { numParam, strParam, sensorParam } from '@/lib/utils/querySync'
import { BOKEH_SHAPE_IDS } from '@/lib/data/dofSimulator/bokeh'
import type { BokehShapeId, TeleconverterId } from '@/lib/data/dofSimulator/types'

/**
 * String param with a `null` default, for optional free-form ids (camera, lens)
 * that come from an open set rather than a fixed allowed-value list — unlike
 * `strParam`, any non-empty raw string parses as valid. Not exported by
 * `@/lib/utils/querySync`, so it's defined locally to the same structural
 * shape its `ParamDef<T>` builders return.
 */
function strOrNullParam() {
  return {
    default: null as string | null,
    parse: (raw: string) => (raw.length > 0 ? raw : undefined),
    serialize: (v: string | null) => v ?? '',
  }
}

// FL bounds 8–1200 match the LensPanel slider range (Task 20) — keep them in sync.
export const PARAM_SCHEMA = {
  fl: numParam(85, 8, 1200),
  f: numParam(2.8, 0.7, 64),
  d: numParam(3, 0.1, 100),
  s: sensorParam('ff'),
  cam: strOrNullParam(),
  lens: strOrNullParam(),
  tc: strParam<TeleconverterId>('none', ['none', 'tc14', 'tc20']),
  subj: sensorParam('woman-a'),
  bg: sensorParam('city-skyline'),
  orient: strParam<'landscape' | 'portrait'>('landscape', ['landscape', 'portrait']),
  bokeh: strParam<BokehShapeId>('disc', BOKEH_SHAPE_IDS),
  ab: strParam<'off' | 'wipe' | 'split'>('off', ['off', 'wipe', 'split']),
  // B (compare) settings — defaults intentionally differ from A so enabling
  // A/B compare mode shows two distinguishable setups out of the box.
  b_fl: numParam(50, 8, 1200),
  b_f: numParam(5.6, 0.7, 64),
  b_d: numParam(3, 0.1, 100),
  b_s: sensorParam('ff'),
}
