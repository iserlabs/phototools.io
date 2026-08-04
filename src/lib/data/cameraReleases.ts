/**
 * Release years (and commonly cited shutter-life ratings, where published or
 * widely reported) for popular camera bodies. Used by the Camera Health
 * Checker to estimate body age and pick a sensible rated-life default.
 *
 * Matching: EXIF Model strings vary wildly ("NIKON Z 8", "NIKON Z 6_2",
 * Sony "ILCE-7M4", "Canon EOS R5"). Both the EXIF model and the match
 * patterns are normalized to lowercase alphanumerics before comparison.
 * Entries are ordered most-specific first (e.g. Z6 III before Z6 II before
 * plain Z6) since matching is first-hit.
 */

export interface CameraRelease {
  model: string
  year: number
  /** Manufacturer-rated shutter actuations, where commonly cited. Omitted when unknown or electronic-shutter-only. */
  ratedActuations?: number
  matches: string[]
}

export const CAMERA_RELEASES: CameraRelease[] = [
  // Nikon Z
  { model: 'Nikon Z9', year: 2021, ratedActuations: 500_000, matches: ['z9'] },
  { model: 'Nikon Z8', year: 2023, ratedActuations: 500_000, matches: ['z8'] },
  { model: 'Nikon Z7 II', year: 2020, ratedActuations: 200_000, matches: ['z72', 'z7ii'] },
  { model: 'Nikon Z7', year: 2018, ratedActuations: 200_000, matches: ['z7'] },
  { model: 'Nikon Z6 III', year: 2024, ratedActuations: 200_000, matches: ['z63', 'z6iii'] },
  { model: 'Nikon Z6 II', year: 2020, ratedActuations: 200_000, matches: ['z62', 'z6ii'] },
  { model: 'Nikon Z6', year: 2018, ratedActuations: 150_000, matches: ['z6'] },
  { model: 'Nikon Z50 II', year: 2024, matches: ['z502', 'z50ii'] },
  { model: 'Nikon Z50', year: 2019, ratedActuations: 100_000, matches: ['z50'] },
  { model: 'Nikon Z5', year: 2020, matches: ['z5'] },
  { model: 'Nikon Zfc', year: 2021, matches: ['zfc'] },
  { model: 'Nikon Zf', year: 2023, ratedActuations: 200_000, matches: ['zf'] },
  // Nikon DSLR
  { model: 'Nikon D6', year: 2020, ratedActuations: 400_000, matches: ['nikond6'] },
  { model: 'Nikon D850', year: 2017, ratedActuations: 200_000, matches: ['d850'] },
  { model: 'Nikon D780', year: 2020, ratedActuations: 150_000, matches: ['d780'] },
  { model: 'Nikon D7500', year: 2017, ratedActuations: 150_000, matches: ['d7500'] },
  { model: 'Nikon D750', year: 2014, ratedActuations: 150_000, matches: ['d750'] },
  { model: 'Nikon D5600', year: 2016, ratedActuations: 100_000, matches: ['d5600'] },
  { model: 'Nikon D3500', year: 2018, ratedActuations: 100_000, matches: ['d3500'] },
  // Canon R + DSLR
  { model: 'Canon EOS R5 Mark II', year: 2024, ratedActuations: 500_000, matches: ['r5markii', 'r5m2'] },
  { model: 'Canon EOS R5', year: 2020, ratedActuations: 500_000, matches: ['eosr5'] },
  { model: 'Canon EOS R6 Mark II', year: 2022, ratedActuations: 300_000, matches: ['r6markii', 'r6m2'] },
  { model: 'Canon EOS R6', year: 2020, ratedActuations: 300_000, matches: ['eosr6'] },
  { model: 'Canon EOS R3', year: 2021, ratedActuations: 500_000, matches: ['eosr3'] },
  { model: 'Canon EOS R7', year: 2022, ratedActuations: 200_000, matches: ['eosr7'] },
  { model: 'Canon EOS R8', year: 2023, matches: ['eosr8'] },
  { model: 'Canon EOS R10', year: 2022, matches: ['eosr10'] },
  { model: 'Canon EOS 5D Mark IV', year: 2016, ratedActuations: 150_000, matches: ['5dmarkiv', '5dm4'] },
  { model: 'Canon EOS 6D Mark II', year: 2017, ratedActuations: 100_000, matches: ['6dmarkii', '6dm2'] },
  { model: 'Canon EOS 90D', year: 2019, ratedActuations: 120_000, matches: ['eos90d'] },
  { model: 'Canon EOS-1D X Mark III', year: 2020, ratedActuations: 500_000, matches: ['1dxmarkiii', '1dxm3'] },
  // Sony (EXIF models use ILCE codes)
  { model: 'Sony A1', year: 2021, ratedActuations: 500_000, matches: ['ilce1'] },
  { model: 'Sony A9 III', year: 2023, matches: ['ilce9m3'] }, // global shutter — no mechanical count
  { model: 'Sony A9 II', year: 2019, ratedActuations: 500_000, matches: ['ilce9m2'] },
  { model: 'Sony A7R V', year: 2022, ratedActuations: 500_000, matches: ['ilce7rm5'] },
  { model: 'Sony A7R IV', year: 2019, ratedActuations: 500_000, matches: ['ilce7rm4'] },
  { model: 'Sony A7 IV', year: 2021, ratedActuations: 200_000, matches: ['ilce7m4'] },
  { model: 'Sony A7 III', year: 2018, ratedActuations: 200_000, matches: ['ilce7m3'] },
  { model: 'Sony A7C II', year: 2023, ratedActuations: 200_000, matches: ['ilce7cm2'] },
  { model: 'Sony A6700', year: 2023, ratedActuations: 200_000, matches: ['ilce6700'] },
  { model: 'Sony A6400', year: 2019, ratedActuations: 200_000, matches: ['ilce6400'] },
  // Fujifilm
  { model: 'Fujifilm X-T5', year: 2022, ratedActuations: 300_000, matches: ['xt5'] },
  { model: 'Fujifilm X-T4', year: 2020, ratedActuations: 300_000, matches: ['xt4'] },
  { model: 'Fujifilm X-H2S', year: 2022, ratedActuations: 500_000, matches: ['xh2s'] },
  { model: 'Fujifilm X-H2', year: 2022, ratedActuations: 500_000, matches: ['xh2'] },
  { model: 'Fujifilm X100VI', year: 2024, matches: ['x100vi'] },
  { model: 'Fujifilm X100V', year: 2020, matches: ['x100v'] },
  { model: 'Fujifilm GFX100 II', year: 2023, ratedActuations: 500_000, matches: ['gfx100ii'] },
  // OM System / Olympus / Panasonic / Pentax / Leica
  { model: 'OM System OM-1', year: 2022, ratedActuations: 400_000, matches: ['om1'] },
  { model: 'Olympus E-M1 Mark III', year: 2020, ratedActuations: 400_000, matches: ['em1markiii'] },
  { model: 'Panasonic Lumix S5 II', year: 2023, matches: ['dcs5m2', 's5ii'] },
  { model: 'Panasonic Lumix G9 II', year: 2023, matches: ['dcg9m2', 'g9ii'] },
  { model: 'Pentax K-3 Mark III', year: 2021, ratedActuations: 300_000, matches: ['k3markiii', 'k3iii'] },
  { model: 'Leica Q3', year: 2023, matches: ['leicaq3'] },
  { model: 'Leica M11', year: 2022, matches: ['leicam11'] },
]

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/gi, '')
}

/** Find a release entry from an EXIF Model string. First match wins (list is most-specific-first). */
export function findCameraRelease(exifModel: string | null | undefined): CameraRelease | null {
  if (!exifModel) return null
  const norm = normalize(exifModel)
  if (!norm) return null
  return CAMERA_RELEASES.find((c) => c.matches.some((m) => norm.includes(normalize(m)))) ?? null
}
