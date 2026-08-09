import { intParam, numParam, sensorParam, strParam, distanceOrInfParam } from '@/lib/utils/querySync'

export const PARAM_SCHEMA = {
  mode: strParam<'distance' | 'macro'>('distance', ['distance', 'macro'] as const),
  fl: intParam(50, 8, 800),
  f: numParam(8, 1, 64),
  s: sensorParam('ff'),
  near: numParam(0.5, 0.1, 100),
  far: distanceOrInfParam(5, 0.1, 100),
  overlap: intParam(20, 10, 50),
  m: numParam(1, 0.25, 5),
  depth: numParam(10, 0.5, 500),
}
