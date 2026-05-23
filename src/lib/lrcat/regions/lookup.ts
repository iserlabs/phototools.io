import { REGION_CENTROIDS } from './centroids'

const DEG_TO_RAD = Math.PI / 180

/**
 * Squared great-circle proxy distance between two lat/lng points.
 *
 * We don't need true kilometers — only relative ordering to find the nearest
 * centroid — so we use the equirectangular approximation (cheap, no sqrt, no
 * trig per comparison beyond a cosine for longitude scaling). This is accurate
 * enough at the country/region granularity this table targets.
 */
function approxDistanceSq(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const meanLatRad = ((lat1 + lat2) / 2) * DEG_TO_RAD
  const dLat = lat1 - lat2
  // Longitude differences shrink toward the poles; scale by cos(meanLat).
  const dLng = (lng1 - lng2) * Math.cos(meanLatRad)
  return dLat * dLat + dLng * dLng
}

/**
 * Map a GPS coordinate to the nearest region centroid's label.
 * Returns null for non-finite or out-of-range coordinates.
 *
 * This is a coarse offline reverse lookup (audit fix M-3) — it labels a point
 * with the nearest known country/sub-region centroid, not a precise address.
 */
export function lookupRegion(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  let bestRegion: string | null = null
  let bestDistSq = Infinity
  for (const c of REGION_CENTROIDS) {
    const d = approxDistanceSq(lat, lng, c.lat, c.lng)
    if (d < bestDistSq) {
      bestDistSq = d
      bestRegion = c.region
    }
  }
  return bestRegion
}

/**
 * Aggregate weighted GPS clusters into a sorted top-region list.
 *
 * Each cluster contributes its photo count to its nearest region. The result
 * is sorted by descending count. Clusters that fail the coordinate sanity
 * check are skipped.
 */
export function topRegionsFromClusters(
  clusters: Array<{ lat: number; lng: number; count: number }>,
): Array<{ region: string; count: number }> {
  const byRegion = new Map<string, number>()
  for (const cluster of clusters) {
    const region = lookupRegion(cluster.lat, cluster.lng)
    if (!region) continue
    byRegion.set(region, (byRegion.get(region) ?? 0) + cluster.count)
  }

  return [...byRegion.entries()]
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region))
}
