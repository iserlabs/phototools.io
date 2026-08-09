#!/usr/bin/env node
// Detects English strings copied verbatim into non-English locale files.
// Exit code 1 if any HARD flag is found.

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const MESSAGES_DIR = 'src/lib/i18n/messages'
const BASE_LOCALE = 'en'

// Allowlist of English tokens that may appear in any locale file.
// These are brand names, technical codes, unit labels, and sensor format proper nouns.
const ALLOWLIST = new Set([
  // Brand/tool names
  'PhotoTools', 'FOV Simulator', 'Frame Studio', 'EXIF Viewer', 'GitHub', 'Reddit',
  'Markdown (Reddit, GitHub)', 'BBCode (Forums)', 'HTML Embed', 'Direct Link',
  // Technical codes
  'EXIF', 'ISO', 'JPEG', 'PNG', 'RAW', 'GPS', 'NPF', 'DoF', 'CoC',
  'WebGL', 'HDR', 'SD', 'CF', 'URL', 'HTML', 'CSS', 'API',
  // Units
  'mm', 'fps', 'px', 'GB', 'MB', 'KB', 'K',
  // Sensor format proper nouns (kept English across all locales by project convention)
  'Full Frame', 'Medium Format (54x40)', 'Medium Format (44x33)', 'Medium Format (45x30)',
  'APS-C (1.5x)', 'APS-C (Canon)', 'APS-C', 'APS-H', 'Micro Four Thirds', '1" Sensor',
  'Smartphone Flagship (1/1.3")', 'Smartphone Mid-range (1/2.55")', 'Smartphone Ultra-wide (1/3.5")',
  // Cinema sensor/format proper nouns (kept English across all locales; flagged HARD in
  // non-Latin-script locales by NON_LATIN_LOCALES since they're short ASCII exact matches)
  'Super 16', 'Super 35 (16:9)', 'RED V-RAPTOR VV', 'ARRI ALEXA 65',
  // Third-party product names + color notation kept English by convention
  'Google AdSense', 'Epson (360)', 'Hex', 'APS-C (Nikon/Sony)',
  // Form placeholders
  'your@email.com', 'Email', 'Website', 'Name',
])

// Regex patterns for strings that are ALWAYS allowed (e.g., f-stop notation, shutter speeds).
const ALLOW_PATTERNS = [
  /^f\/[\d.]+$/,                   // f/1.4, f/2.8, f/5.6, etc.
  /^[\d.]+$/,                      // pure numbers
  /^\d+\/\d+s?$/,                  // 1/250s, 1/60
  /^\d+s$/,                        // 30s
  /^\d+K$/,                        // 5500K (color temperature)
  /^\d+mm$/,                       // 50mm
  /^-?\d+(\.\d+)?\s*(EV|stops?)$/i, // -2 EV, +1 stop
]

/**
 * Units and acronyms that stay untranslated by project convention.
 * Used by isNotation() below, which allows any string built purely from
 * placeholders, numbers, punctuation, units, and acronyms.
 */
const UNITS = new Set([
  'mm', 'cm', 'm', 'km', 'in', 'ft', 'px', 'mp', 'gb', 'mb', 'kb', 'tb',
  'k', 'ev', 'fps', 's', 'ms', 'nm', 'um', 'dpi', 'ppi', 'bit', 'x', 'vs', 'f',
])

/** Uppercase technical codes: ISO, GPS, JPEG, DPI, RGB, CSS, RAW, APS-H, HEIC, sRGB… */
const ACRONYM = /^[A-Z][A-Z0-9]{1,6}(-[A-Z0-9]{1,4})?$/

/**
 * True when a string carries no translatable prose — only interpolation
 * placeholders, numbers, punctuation, units, and technical acronyms.
 * e.g. "{pct}%", "24mm", "12 MP", "100 mm+", "ISO", "f/2.8 – f/8", "RGB".
 * Without this, notation dominates the report and buries real leaks.
 */
function isNotation(value, loanwords = new Set()) {
  const stripped = value
    .replace(/\{[a-zA-Z0-9_]+\}/g, ' ')  // interpolation placeholders
    .replace(/%s|%d/g, ' ')              // printf-style tokens
    // Dimension separators only between digits ("20x13", "3 × 2"). The literal
    // "x" must NOT go in the class below, or it is stripped out of real words
    // ("Pixel" → "Pi el") and the word check silently misreads them.
    .replace(/(?<=\d)\s*[x×]\s*(?=\d)/g, ' ')
    .replace(/[\d.,:/+×·–—~\-()[\]%°"'|@]/g, ' ')
  const words = stripped.split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  return words.every(
    (w) => UNITS.has(w.toLowerCase()) || ACRONYM.test(w) || ALLOWLIST.has(w)
      || loanwords.has(w.toLowerCase()),
  )
}

const STOPWORDS = ['the', 'and', 'of', 'is', 'to', 'in', 'a', 'with', 'for', 'on', 'at', 'by', 'from']

/**
 * Locales that do not use the Latin alphabet. The "short identical strings are
 * probably cognates" assumption only holds for Latin-script languages — a bare
 * ASCII word like "Cameras" or "Lenses" sitting in the Japanese or Russian
 * bundle is a leak no matter how short it is. For these locales, short
 * identical matches are escalated from SOFT to HARD.
 *
 * This blind spot let ~90 untranslated strings sit undetected in the Lightroom
 * Catalog Analyzer bundles (fixed 2026-08-04).
 */
const NON_LATIN_LOCALES = new Set(['ja', 'ko', 'zh', 'zh-TW', 'th', 'hi', 'bn', 'ru', 'uk', 'el'])

/** True when a value is pure ASCII (i.e. contains no character from the locale's own script). */
function isAsciiOnly(value) {
  return /^[\x20-\x7E]*$/.test(value) && /[A-Za-z]{2,}/.test(value)
}

function getLocales() {
  return readdirSync(MESSAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== BASE_LOCALE)
    .map((d) => d.name)
}

function getJsonFiles(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...getJsonFiles(p).map((f) => join(e.name, f)))
    else if (e.name.endsWith('.json')) out.push(e.name)
  }
  return out
}

function flatten(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'object' && v !== null) Object.assign(out, flatten(v, `${prefix}${k}.`))
    else if (typeof v === 'string') out[`${prefix}${k}`] = v
  }
  return out
}

/**
 * Per-locale loanwords: English words a specific language genuinely uses.
 * Scoped per locale on purpose — "Macro" is native Greek usage but would be a
 * real leak in Japanese, so a global allowlist would hide regressions.
 *
 * Only add an entry with evidence: the word must already appear untranslated
 * inside that locale's own translated prose. (The entries below were each
 * verified that way — e.g. Greek uses "macro φακούς" 15 times and never μάκρο.)
 */
const LOCALE_LOANWORDS = {
  el: new Set([
    'bokeh', 'macro', 'kelvin', 'clipping', 'bracketing', 'stop', 'stops',
    'cookies', 'pixel', 'binning', 'medium', 'format', 'web', 'crop',
  ]),
}

function isAllowed(value, locale) {
  const trimmed = value.trim()
  if (ALLOWLIST.has(trimmed)) return true
  for (const pattern of ALLOW_PATTERNS) {
    if (pattern.test(trimmed)) return true
  }
  return isNotation(trimmed, LOCALE_LOANWORDS[locale] ?? new Set())
}

function countStopwords(value) {
  const words = value.toLowerCase().split(/\s+/)
  return words.filter((w) => STOPWORDS.includes(w)).length
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1]
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
    }
  }
  return matrix[b.length][a.length]
}

function scanLocale(locale) {
  const baseFiles = getJsonFiles(join(MESSAGES_DIR, BASE_LOCALE))
  const hard = []
  const soft = []

  for (const file of baseFiles) {
    const enPath = join(MESSAGES_DIR, BASE_LOCALE, file)
    const localePath = join(MESSAGES_DIR, locale, file)
    let enFlat, locFlat
    try {
      enFlat = flatten(JSON.parse(readFileSync(enPath, 'utf8')))
      locFlat = flatten(JSON.parse(readFileSync(localePath, 'utf8')))
    } catch (e) {
      hard.push({ file, key: '*', en: '', loc: '', reason: `read/parse failed: ${e.message}` })
      continue
    }

    for (const [key, enVal] of Object.entries(enFlat)) {
      const locVal = locFlat[key]
      if (locVal === undefined) continue
      if (typeof locVal !== 'string') continue
      if (isAllowed(locVal, locale)) continue

      // HARD flag: long strings identical to English source are real leaks.
      // Short strings (≤25 chars) identical to English are usually cross-language cognates
      // like "Distance", "Contact", "Message", "Email", "Sensor" — skip them.
      if (enVal === locVal && enVal.length > 25) {
        hard.push({ file, key, en: enVal, loc: locVal, reason: 'identical to en source (long)' })
        continue
      }

      // Short identical matches. In a non-Latin-script locale an all-ASCII
      // value can't be a cognate — flag it HARD. Elsewhere it's usually
      // legitimate ("Total", "Start", "Sensor"), so keep it SOFT.
      if (enVal === locVal && enVal.length > 2) {
        const level = NON_LATIN_LOCALES.has(locale) && isAsciiOnly(locVal) ? hard : soft
        level.push({ file, key, en: enVal, loc: locVal, reason: 'identical to en source (short)' })
        continue
      }

      if (countStopwords(locVal) >= 3) {
        soft.push({ file, key, en: enVal, loc: locVal, reason: '3+ English stopwords' })
        continue
      }

      if (enVal.length > 20 && locVal.length > 20) {
        const dist = levenshtein(enVal.toLowerCase(), locVal.toLowerCase())
        if (dist < 5) {
          soft.push({ file, key, en: enVal, loc: locVal, reason: `levenshtein=${dist}` })
        }
      }
    }
  }
  return { hard, soft }
}

const locales = getLocales()
let totalHard = 0
let totalSoft = 0
const report = {}

for (const locale of locales) {
  const { hard, soft } = scanLocale(locale)
  if (hard.length || soft.length) {
    report[locale] = { hard, soft }
    totalHard += hard.length
    totalSoft += soft.length
  }
}

if (totalHard === 0 && totalSoft === 0) {
  console.log('✓ No English leaks detected across all locales.')
  process.exit(0)
}

console.log(`Found ${totalHard} HARD leaks and ${totalSoft} SOFT leaks across ${Object.keys(report).length} locale(s).\n`)
for (const [locale, { hard, soft }] of Object.entries(report)) {
  console.log(`=== ${locale} ===`)
  console.log(`  HARD: ${hard.length}`)
  for (const leak of hard.slice(0, 10)) {
    console.log(`    [${leak.file}] ${leak.key}: "${leak.loc}" — ${leak.reason}`)
  }
  if (hard.length > 10) console.log(`    ... and ${hard.length - 10} more`)
  console.log(`  SOFT: ${soft.length}`)
  for (const leak of soft.slice(0, 5)) {
    console.log(`    [${leak.file}] ${leak.key}: "${leak.loc}" — ${leak.reason}`)
  }
  if (soft.length > 5) console.log(`    ... and ${soft.length - 5} more`)
  console.log()
}

process.exit(totalHard > 0 ? 1 : 0)
