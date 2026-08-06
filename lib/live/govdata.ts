'use client'

// Bundled (offline) geo reference data, ported from the Flutter app so the
// website's "מה יש בסביבה" section can show facts Overpass can't answer:
//   • curated named reference points — verbatim port of the small constant
//     arrays in lib/core/search/engine/feature_engineering.dart (_stations,
//     _cbds, _universities, _coast) — DO NOT regenerate, these are hand-picked
//   • 10 bundled POI kinds from assets/data/govdata/*.json, copied byte-for-
//     byte into public/data/govdata/ and fetched once per page load
//
// Unlike lib/live/nearby.ts (live Overpass fetch, sessionStorage-cached per
// coordinate), these files are static and shipped with the site, so a single
// in-memory promise cache for the process lifetime is all we need — no need
// to key by coordinate or expire.

import { haversineKm } from './nearby'

export interface NamedPoint {
  name: string
  lat: number
  lon: number
}

export interface GovPoi {
  name: string
  lat: number
  lon: number
  type?: string
}

export interface GovPlace {
  name: string
  lat: number
  lon: number
  km: number
}

const finite = (...ns: number[]) => ns.every((n) => Number.isFinite(n))

// ---------------------------------------------------------------------------
// Curated reference points — verbatim port of feature_engineering.dart
// (_stations / _cbds / _universities / _coast). Coordinates and Hebrew names
// copied as-is; the _cbds "weight" field isn't used by anything we port here
// so it's dropped.
// ---------------------------------------------------------------------------

/** Named rail stations (port of `_stations`). */
export const STATIONS: NamedPoint[] = [
  { name: 'ת"א סבידור מרכז', lat: 32.0833, lon: 34.7991 },
  { name: 'ת"א השלום', lat: 32.0734, lon: 34.792 },
  { name: 'ת"א ההגנה', lat: 32.054, lon: 34.794 },
  { name: 'ת"א אוניברסיטה', lat: 32.114, lon: 34.804 },
  { name: 'הרצליה', lat: 32.166, lon: 34.834 },
  { name: 'נתניה', lat: 32.318, lon: 34.857 },
  { name: 'רעננה מערב', lat: 32.182, lon: 34.851 },
  { name: 'כפר סבא נורדאו', lat: 32.167, lon: 34.916 },
  { name: 'פ"ת קריית אריה', lat: 32.103, lon: 34.857 },
  { name: 'בני ברק', lat: 32.093, lon: 34.834 },
  { name: 'ראשל"צ הראשונים', lat: 31.962, lon: 34.806 },
  { name: 'רחובות', lat: 31.917, lon: 34.797 },
  { name: 'לוד', lat: 31.948, lon: 34.872 },
  { name: 'רמלה', lat: 31.928, lon: 34.864 },
  { name: 'מודיעין מרכז', lat: 31.901, lon: 35.007 },
  { name: 'בית שמש', lat: 31.747, lon: 34.988 },
  { name: 'ירושלים יצחק נבון', lat: 31.787, lon: 35.203 },
  { name: 'אשדוד עד הלום', lat: 31.77, lon: 34.661 },
  { name: 'אשקלון', lat: 31.652, lon: 34.578 },
  { name: 'באר שבע מרכז', lat: 31.243, lon: 34.798 },
  { name: 'חיפה חוף הכרמל', lat: 32.794, lon: 34.957 },
  { name: 'חיפה בת גלים', lat: 32.831, lon: 34.989 },
  { name: 'חיפה מרכז השמונה', lat: 32.821, lon: 35.0 },
]

/** Employment / commercial cores (port of `_cbds`, weight field dropped). */
export const EMPLOYMENT_CENTERS: NamedPoint[] = [
  { name: 'ת"א - הקריה/רוטשילד', lat: 32.07, lon: 34.78 },
  { name: 'רמת גן - הבורסה', lat: 32.084, lon: 34.806 },
  { name: 'הרצליה פיתוח', lat: 32.162, lon: 34.806 },
  { name: 'ירושלים - מרכז', lat: 31.78, lon: 35.217 },
  { name: 'חיפה - מרכז', lat: 32.819, lon: 34.998 },
  { name: 'באר שבע - מרכז', lat: 31.252, lon: 34.791 },
]

/** Universities and colleges (port of `_universities`). */
export const UNIVERSITIES: NamedPoint[] = [
  { name: 'אוניברסיטת ת"א', lat: 32.1133, lon: 34.8044 },
  { name: 'הטכניון', lat: 32.7767, lon: 35.0233 },
  { name: 'האונ׳ העברית גבעת רם', lat: 31.777, lon: 35.197 },
  { name: 'האונ׳ העברית הר הצופים', lat: 31.794, lon: 35.244 },
  { name: 'בן גוריון', lat: 31.262, lon: 34.801 },
  { name: 'בר אילן', lat: 32.069, lon: 34.843 },
  { name: 'אונ׳ חיפה', lat: 32.761, lon: 35.02 },
  { name: 'אונ׳ אריאל', lat: 32.103, lon: 35.207 },
  { name: 'הפתוחה רעננה', lat: 32.181, lon: 34.871 },
  { name: 'מכון ויצמן רחובות', lat: 31.907, lon: 34.81 },
  { name: 'הפקולטה לחקלאות רחובות', lat: 31.905, lon: 34.806 },
  { name: 'מכללת פרס רחובות', lat: 31.894, lon: 34.808 },
  { name: 'רייכמן הרצליה', lat: 32.174, lon: 34.839 },
  { name: 'אפקה ת"א', lat: 32.113, lon: 34.818 },
  { name: 'לוינסקי ת"א', lat: 32.094, lon: 34.783 },
  { name: 'שנקר ר"ג', lat: 32.064, lon: 34.828 },
  { name: 'אונו קרית אונו', lat: 32.056, lon: 34.856 },
  { name: 'HIT חולון', lat: 32.015, lon: 34.774 },
  { name: 'המכללה למינהל ראשל"צ', lat: 31.967, lon: 34.793 },
  { name: 'רופין עמק חפר', lat: 32.34, lon: 34.917 },
  { name: 'המכללה האקדמית נתניה', lat: 32.305, lon: 34.865 },
  { name: 'בצלאל ירושלים', lat: 31.79, lon: 35.202 },
  { name: 'הדסה ירושלים', lat: 31.781, lon: 35.221 },
  { name: 'סמי שמעון ב"ש', lat: 31.251, lon: 34.792 },
  { name: 'ספיר שדרות', lat: 31.556, lon: 34.585 },
  { name: 'אחוה', lat: 31.75, lon: 34.7 },
  { name: 'בן גוריון אילת', lat: 29.556, lon: 34.951 },
  { name: 'בראודה כרמיאל', lat: 32.913, lon: 35.302 },
  { name: 'תל חי', lat: 33.234, lon: 35.576 },
  { name: 'כנרת', lat: 32.708, lon: 35.576 },
  { name: 'עמק יזרעאל', lat: 32.647, lon: 35.296 },
]

/** Coarse Mediterranean coastline reference points (port of `_coast`). */
export const COAST: NamedPoint[] = [
  { name: 'ת"א חוף', lat: 32.08, lon: 34.766 },
  { name: 'הרצליה חוף', lat: 32.164, lon: 34.792 },
  { name: 'נתניה חוף', lat: 32.33, lon: 34.85 },
  { name: 'חיפה חוף', lat: 32.82, lon: 34.97 },
  { name: 'אשדוד חוף', lat: 31.79, lon: 34.63 },
  { name: 'בת ים חוף', lat: 32.015, lon: 34.735 },
]

/** Nearest point in `list` by haversine distance, or null (bad input / empty list). */
export function nearestNamed(
  lat: number,
  lon: number,
  list: NamedPoint[],
): { name: string; km: number } | null {
  if (!finite(lat, lon) || list.length === 0) return null
  let best: { name: string; km: number } | null = null
  for (const p of list) {
    const km = haversineKm(lat, lon, p.lat, p.lon)
    if (!Number.isFinite(km)) continue
    if (!best || km < best.km) best = { name: p.name, km }
  }
  return best
}

/**
 * Nearest rail station. Prefers the bundled rail_stations.json (hundreds of
 * named platforms, loaded by loadGovdataPois) once it's ready — that's the
 * "precise" source; falls back to the small curated STATIONS list so the hero
 * pill has an answer immediately on first render, before the JSON fetch lands.
 */
export function nearestStation(lat: number, lon: number) {
  const list = railStationsBundled.length > 0 ? railStationsBundled : STATIONS
  return nearestNamed(lat, lon, list)
}

export function nearestCbd(lat: number, lon: number) {
  return nearestNamed(lat, lon, EMPLOYMENT_CENTERS)
}

export function nearestUniversity(lat: number, lon: number) {
  return nearestNamed(lat, lon, UNIVERSITIES)
}

/** Distance to the nearest Mediterranean coast reference point, in km (or null). */
export function coastDistance(lat: number, lon: number): number | null {
  return nearestNamed(lat, lon, COAST)?.km ?? null
}

// ---------------------------------------------------------------------------
// Bundled POI kinds (public/data/govdata/*.json) — fetched once, cached in
// memory for the life of the page.
// ---------------------------------------------------------------------------

export type GovKind =
  | 'synagogues'
  | 'pools'
  | 'dog_parks'
  | 'vets'
  | 'bike_share'
  | 'coworking'
  | 'parking'
  | 'nightlife_venues'
  | 'poi_retail'
  | 'future_infra'

const KIND_FILES: Record<GovKind, string> = {
  synagogues: 'synagogues.json',
  pools: 'pools.json',
  dog_parks: 'dog_parks.json',
  vets: 'vets.json',
  bike_share: 'bike_share.json',
  coworking: 'coworking.json',
  parking: 'parking.json',
  nightlife_venues: 'nightlife_venues.json',
  poi_retail: 'poi_retail.json',
  future_infra: 'future_infra.json',
}

// Fallback display name when a bundled record has no `n` (name) field —
// mirrors the existing `pl.name || 'ללא שם'` convention in NearbyPlaces, but
// with a category-specific label since most govdata records ARE unnamed
// (dog_parks/parking/bike_share have no `n` at all in the source data).
const KIND_FALLBACK_NAME: Record<GovKind, string> = {
  synagogues: 'בית כנסת',
  pools: 'בריכת שחייה',
  dog_parks: 'גן כלבים',
  vets: 'וטרינר',
  bike_share: 'עמדת אופניים משותפות',
  coworking: 'חלל עבודה משותף',
  parking: 'חניה ציבורית',
  nightlife_venues: 'מקום בילוי',
  poi_retail: 'מרכז מסחר',
  future_infra: 'תחנת רכבת קלה מתוכננת',
}

function asNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// {lat,lon,n?,t?}[] — the shape of every bundled file except poi_retail and
// future_infra (see below).
function parseSimpleList(raw: unknown, fallbackName: string): GovPoi[] {
  if (!Array.isArray(raw)) return []
  const out: GovPoi[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const p = item as Record<string, unknown>
    const lat = asNum(p.lat)
    const lon = asNum(p.lon)
    if (lat == null || lon == null) continue
    const n = typeof p.n === 'string' ? p.n.trim() : ''
    out.push({
      name: n || fallbackName,
      lat,
      lon,
      type: typeof p.t === 'string' ? p.t : undefined,
    })
  }
  return out
}

// future_infra.json is `{ stations: [[lat, lon], ...] }` — planned light-rail
// stations with no names at all (unlike every other bundled kind).
function parseFutureInfra(raw: unknown): GovPoi[] {
  if (!raw || typeof raw !== 'object') return []
  const stations = (raw as Record<string, unknown>).stations
  if (!Array.isArray(stations)) return []
  const out: GovPoi[] = []
  for (const s of stations) {
    if (!Array.isArray(s) || s.length < 2) continue
    const lat = asNum(s[0])
    const lon = asNum(s[1])
    if (lat == null || lon == null) continue
    out.push({ name: KIND_FALLBACK_NAME.future_infra, lat, lon })
  }
  return out
}

// poi_retail.json is a retail-density GRID, not a point list:
// { cell: 0.02, cells: { "latIdx_lonIdx": [count, notableCount] } }.
// We treat each populated cell as one generic "retail center" point at the
// cell's center — an approximation (± ~1km at Israel's latitude) but good
// enough for a "מרכזי מסחר בסביבה" list; cells with 0 POIs are skipped.
function parseRetailGrid(raw: unknown): GovPoi[] {
  if (!raw || typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  const cell = typeof obj.cell === 'number' && obj.cell > 0 ? obj.cell : 0.02
  const cells = obj.cells
  if (!cells || typeof cells !== 'object') return []
  const out: GovPoi[] = []
  for (const [key, val] of Object.entries(cells as Record<string, unknown>)) {
    const m = /^(-?\d+)_(-?\d+)$/.exec(key)
    if (!m) continue
    const count = Array.isArray(val) && typeof val[0] === 'number' ? val[0] : 0
    if (count <= 0) continue
    const lat = (Number(m[1]) + 0.5) * cell
    const lon = (Number(m[2]) + 0.5) * cell
    if (!finite(lat, lon)) continue
    out.push({ name: KIND_FALLBACK_NAME.poi_retail, lat, lon, type: 'retail' })
  }
  return out
}

// rail_stations.json is `[[lat, lon, name], ...]` — a much richer/precise
// station list than the curated STATIONS constant above.
function parseRailStations(raw: unknown): NamedPoint[] {
  if (!Array.isArray(raw)) return []
  const out: NamedPoint[] = []
  for (const s of raw) {
    if (!Array.isArray(s) || s.length < 2) continue
    const lat = asNum(s[0])
    const lon = asNum(s[1])
    if (lat == null || lon == null) continue
    const name = typeof s[2] === 'string' && s[2].trim() ? s[2].trim() : 'תחנת רכבת'
    out.push({ name, lat, lon })
  }
  return out
}

const GOV_STORE: Partial<Record<GovKind, GovPoi[]>> = {}
let railStationsBundled: NamedPoint[] = []
let govdataPromise: Promise<void> | null = null

/**
 * Fetches all 11 bundled govdata JSON files from /data/govdata/ exactly once
 * per page load (module-level promise cache — these are static assets
 * shipped with the site, not per-coordinate live data, so no sessionStorage
 * or coordinate keying is needed). Safe to call from multiple components;
 * every caller shares the same in-flight/resolved promise. Best-effort per
 * file — a single missing/malformed file doesn't fail the others.
 */
export function loadGovdataPois(): Promise<void> {
  if (govdataPromise) return govdataPromise
  govdataPromise = (async () => {
    const kinds = Object.keys(KIND_FILES) as GovKind[]
    await Promise.all([
      ...kinds.map(async (k) => {
        try {
          const res = await fetch(`/data/govdata/${KIND_FILES[k]}`)
          if (!res.ok) return
          const raw: unknown = await res.json()
          GOV_STORE[k] =
            k === 'future_infra'
              ? parseFutureInfra(raw)
              : k === 'poi_retail'
                ? parseRetailGrid(raw)
                : parseSimpleList(raw, KIND_FALLBACK_NAME[k])
        } catch {
          // best-effort — leave this kind empty, others still load
        }
      }),
      (async () => {
        try {
          const res = await fetch('/data/govdata/rail_stations.json')
          if (!res.ok) return
          const raw: unknown = await res.json()
          railStationsBundled = parseRailStations(raw)
        } catch {
          // best-effort — nearestStation() falls back to curated STATIONS
        }
      })(),
    ])
  })()
  return govdataPromise
}

/**
 * Nearest-first bundled POIs of `kind` within `radiusKm`, capped at `cap`.
 * Same {name,lat,lon,km} shape and nearest-first/capped behavior as the
 * Overpass-based kinds in nearby.ts's `group()`, so callers can merge both
 * sources into one NearbyByKind without special-casing. Returns [] before
 * loadGovdataPois() resolves, on bad input, or when nothing is in range.
 */
export function poisWithin(
  kind: GovKind,
  lat: number,
  lon: number,
  radiusKm: number,
  cap = 24,
): GovPlace[] {
  if (!finite(lat, lon, radiusKm) || radiusKm <= 0) return []
  const list = GOV_STORE[kind]
  if (!list || list.length === 0) return []
  const out: GovPlace[] = []
  for (const p of list) {
    const km = haversineKm(lat, lon, p.lat, p.lon)
    if (!Number.isFinite(km) || km > radiusKm) continue
    out.push({ name: p.name, lat: p.lat, lon: p.lon, km })
  }
  out.sort((a, b) => a.km - b.km)
  return out.length > cap ? out.slice(0, cap) : out
}
