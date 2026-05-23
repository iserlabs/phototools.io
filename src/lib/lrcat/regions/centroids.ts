// Offline lat/lng → region lookup table for the Lightroom Catalog Analyzer.
//
// This is a coarse, dependency-free nearest-centroid table. Each entry is a
// representative point for a country (or a large sub-region for very large
// countries) with a human-readable region name. `lookupRegion()` assigns a
// GPS coordinate to the nearest centroid by great-circle distance.
//
// It is intentionally small and approximate — it exists so the GPS block's
// `topRegions` is populated with sensible country/region labels rather than
// shipping permanently empty (audit fix M-3). It is NOT a precise reverse
// geocoder: a point in the middle of an ocean simply resolves to whatever
// landmass centroid is nearest. The clustering threshold (≥5 photos per
// ~5 km cell) means stray mislabels have negligible impact on the top list.

export interface RegionCentroid {
  region: string
  lat: number
  lng: number
}

/**
 * Representative centroids for major countries / large sub-regions.
 * Large countries (US, Canada, Russia, China, Australia, Brazil) are split
 * into a few sub-regions so a coast-to-coast catalog doesn't collapse into a
 * single national label.
 */
export const REGION_CENTROIDS: readonly RegionCentroid[] = [
  // North America
  { region: 'United States (West)', lat: 37.5, lng: -120.0 },
  { region: 'United States (Mountain)', lat: 39.5, lng: -106.0 },
  { region: 'United States (Central)', lat: 39.0, lng: -94.0 },
  { region: 'United States (East)', lat: 40.0, lng: -76.0 },
  { region: 'United States (Southeast)', lat: 31.0, lng: -84.0 },
  { region: 'United States (Alaska)', lat: 64.0, lng: -150.0 },
  { region: 'United States (Hawaii)', lat: 20.8, lng: -156.3 },
  { region: 'Canada (West)', lat: 53.0, lng: -123.0 },
  { region: 'Canada (Central)', lat: 52.0, lng: -97.0 },
  { region: 'Canada (East)', lat: 47.0, lng: -71.0 },
  { region: 'Mexico', lat: 23.6, lng: -102.5 },
  { region: 'Guatemala', lat: 15.5, lng: -90.3 },
  { region: 'Costa Rica', lat: 9.7, lng: -83.8 },
  { region: 'Cuba', lat: 21.5, lng: -79.5 },

  // South America
  { region: 'Brazil (North)', lat: -5.0, lng: -60.0 },
  { region: 'Brazil (Southeast)', lat: -22.0, lng: -45.0 },
  { region: 'Argentina', lat: -34.0, lng: -64.0 },
  { region: 'Chile', lat: -35.0, lng: -71.0 },
  { region: 'Peru', lat: -10.0, lng: -76.0 },
  { region: 'Colombia', lat: 4.0, lng: -73.0 },
  { region: 'Bolivia', lat: -17.0, lng: -65.0 },
  { region: 'Ecuador', lat: -1.5, lng: -78.5 },

  // Europe
  { region: 'United Kingdom', lat: 54.0, lng: -2.5 },
  { region: 'Ireland', lat: 53.4, lng: -8.0 },
  { region: 'France', lat: 46.5, lng: 2.5 },
  { region: 'Spain', lat: 40.0, lng: -3.7 },
  { region: 'Portugal', lat: 39.5, lng: -8.0 },
  { region: 'Italy', lat: 42.8, lng: 12.5 },
  { region: 'Germany', lat: 51.0, lng: 10.0 },
  { region: 'Netherlands', lat: 52.2, lng: 5.3 },
  { region: 'Belgium', lat: 50.6, lng: 4.6 },
  { region: 'Switzerland', lat: 46.8, lng: 8.2 },
  { region: 'Austria', lat: 47.5, lng: 14.5 },
  { region: 'Poland', lat: 52.0, lng: 19.5 },
  { region: 'Czechia', lat: 49.8, lng: 15.5 },
  { region: 'Norway', lat: 61.0, lng: 9.0 },
  { region: 'Sweden', lat: 62.0, lng: 15.5 },
  { region: 'Finland', lat: 64.0, lng: 26.0 },
  { region: 'Denmark', lat: 56.0, lng: 9.5 },
  { region: 'Iceland', lat: 64.9, lng: -19.0 },
  { region: 'Greece', lat: 39.0, lng: 22.0 },
  { region: 'Croatia', lat: 45.1, lng: 15.5 },
  { region: 'Romania', lat: 45.9, lng: 25.0 },
  { region: 'Hungary', lat: 47.2, lng: 19.5 },
  { region: 'Ukraine', lat: 49.0, lng: 32.0 },

  // Africa & Middle East
  { region: 'Morocco', lat: 31.8, lng: -7.0 },
  { region: 'Egypt', lat: 26.8, lng: 30.0 },
  { region: 'South Africa', lat: -29.0, lng: 24.0 },
  { region: 'Kenya', lat: 0.2, lng: 37.9 },
  { region: 'Tanzania', lat: -6.4, lng: 34.9 },
  { region: 'Nigeria', lat: 9.1, lng: 8.7 },
  { region: 'Ethiopia', lat: 9.1, lng: 40.5 },
  { region: 'Turkey', lat: 39.0, lng: 35.0 },
  { region: 'Israel', lat: 31.5, lng: 35.0 },
  { region: 'United Arab Emirates', lat: 24.0, lng: 54.0 },
  { region: 'Saudi Arabia', lat: 24.0, lng: 45.0 },

  // Asia
  { region: 'Russia (West)', lat: 56.0, lng: 44.0 },
  { region: 'Russia (Siberia)', lat: 60.0, lng: 95.0 },
  { region: 'China (East)', lat: 31.0, lng: 119.0 },
  { region: 'China (West)', lat: 36.0, lng: 92.0 },
  { region: 'Japan', lat: 36.2, lng: 138.3 },
  { region: 'South Korea', lat: 36.5, lng: 127.8 },
  { region: 'India', lat: 22.0, lng: 79.0 },
  { region: 'Nepal', lat: 28.4, lng: 84.1 },
  { region: 'Thailand', lat: 15.0, lng: 101.0 },
  { region: 'Vietnam', lat: 16.0, lng: 106.0 },
  { region: 'Indonesia', lat: -2.5, lng: 118.0 },
  { region: 'Philippines', lat: 12.9, lng: 122.0 },
  { region: 'Malaysia', lat: 3.5, lng: 102.0 },
  { region: 'Singapore', lat: 1.35, lng: 103.8 },

  // Oceania
  { region: 'Australia (East)', lat: -33.0, lng: 151.0 },
  { region: 'Australia (Central/West)', lat: -25.0, lng: 122.0 },
  { region: 'New Zealand', lat: -41.0, lng: 173.0 },
  { region: 'Fiji', lat: -17.8, lng: 178.0 },
] as const
