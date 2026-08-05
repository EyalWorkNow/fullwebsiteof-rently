// Live, COMPREHENSIVE nearby-POI lookup from OpenStreetMap via the Overpass API.
//
// The Overpass QL query, tag→category mapping and dedupe rules are a verbatim
// port of the app's lib/core/services/overpass_poi_service.dart — DO NOT edit
// them — so the website's listing page shows the same geo intelligence as the
// app's property page.
//
// Around that core this module adds a defensive delivery layer:
//   • every coordinate validated finite before use, unusable elements dropped
//   • per-kind cap (24) so the UI never has to render unbounded lists
//   • fetchNearby(signal) — abortable; throws NearbyError when ALL mirrors fail
//     (so the UI can offer retry) but resolves {} for a genuine "nothing here"
//   • loadNearby() — sessionStorage cache (lat/lon @3 decimals) + module-level
//     in-flight dedupe with refcounting, so React strict-mode double-mounts
//     share one network request and aborting one subscriber doesn't kill the
//     other's fetch.

export interface NearbyPlace {
  name: string
  km: number
  lat: number
  lon: number
  kind: string
}

export type NearbyByKind = Record<string, NearbyPlace[]>

/** Thrown when every Overpass mirror failed (network/HTTP/parse). */
export class NearbyError extends Error {
  constructor() {
    super('nearby-fetch-failed')
    this.name = 'NearbyError'
  }
}

export const MAX_PER_KIND = 24

const EARTH_RADIUS_KM = 6371.0088

const rad = (d: number) => (d * Math.PI) / 180

const finite = (...ns: number[]) => ns.every((n) => Number.isFinite(n))

/** Haversine great-circle distance in km (port of IsraelGeoIndex.haversineKm). */
export function haversineKm(la1: number, lo1: number, la2: number, lo2: number): number {
  if (!finite(la1, lo1, la2, lo2)) return NaN
  const dLa = rad(la2 - la1)
  const dLo = rad(lo2 - lo1)
  const a =
    Math.sin(dLa / 2) * Math.sin(dLa / 2) +
    Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLo / 2) * Math.sin(dLo / 2)
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** True initial bearing in degrees (0 = north, clockwise) from point 1 to point 2. */
export function bearingDeg(la1: number, lo1: number, la2: number, lo2: number): number {
  if (!finite(la1, lo1, la2, lo2)) return 0
  const f1 = rad(la1)
  const f2 = rad(la2)
  const dLo = rad(lo2 - lo1)
  const y = Math.sin(dLo) * Math.cos(f2)
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dLo)
  const deg = (Math.atan2(y, x) * 180) / Math.PI
  return Number.isFinite(deg) ? (deg + 360) % 360 : 0
}

/** Walking minutes at ~80 m/min, never less than 1. NaN-safe (returns null). */
export function walkMinutes(km: number): number | null {
  if (!Number.isFinite(km) || km < 0) return null
  return Math.max(1, Math.round((km * 1000) / 80))
}

/** Distance label — port of the app card's _distLabel, guarded against NaN. */
export function distLabel(km: number): string {
  if (!Number.isFinite(km) || km < 0) return ''
  return km < 1 ? `${Math.round(km * 1000)} מ׳` : `${km.toFixed(1)} ק״מ`
}

/** Walking-minutes label: "3 דק׳ הליכה", or just "17 דק׳" from 15 minutes up. */
export function walkLabel(km: number): string | null {
  const m = walkMinutes(km)
  if (m == null) return null
  return m >= 15 ? `${m} דק׳` : `${m} דק׳ הליכה`
}

// Public Overpass mirrors (same order as the app). The browser sets its own
// User-Agent (a forbidden fetch header); Accept + text/plain body match the app.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

// ONE request fetches every category — identical Overpass QL to the Dart service.
function buildQuery(lat: number, lon: number, r: number): string {
  return (
    `[out:json][timeout:25];(` +
    `nwr(around:${r},${lat},${lon})[amenity~"^(cafe|restaurant|fast_food|bar|pub|ice_cream|food_court|pharmacy|school|kindergarten|clinic|doctors|hospital|dentist|cinema|theatre|arts_centre|library|community_centre|place_of_worship|bus_station|marketplace)$"];` +
    `nwr(around:${r},${lat},${lon})[leisure~"^(fitness_centre|sports_centre|park|garden|nature_reserve|playground)$"];` +
    `nwr(around:${r},${lat},${lon})[shop~"^(supermarket|convenience|greengrocer|grocery)$"];` +
    `nwr(around:${r},${lat},${lon})[tourism~"^(museum|gallery)$"];` +
    `nwr(around:${r},${lat},${lon})[railway~"^(station|tram_stop)$"];` +
    `nwr(around:${r},${lat},${lon})[public_transport=station];` +
    // High cap so even the densest city centre is never truncated.
    `);out center tags 3000;`
  )
}

// OSM tags → our category key. Verbatim port of OverpassPoiService._category.
function category(t: Record<string, unknown>): string | null {
  const a = t['amenity']
  const l = t['leisure']
  const s = t['shop']
  const to = t['tourism']
  const rw = t['railway']
  const pt = t['public_transport']
  if (
    a === 'cafe' ||
    a === 'restaurant' ||
    a === 'fast_food' ||
    a === 'bar' ||
    a === 'pub' ||
    a === 'ice_cream' ||
    a === 'food_court'
  ) {
    return 'dining'
  }
  if (a === 'pharmacy') return 'pharmacies'
  if (a === 'school') return 'schools'
  if (a === 'kindergarten') return 'kindergartens'
  if (a === 'clinic' || a === 'doctors' || a === 'hospital' || a === 'dentist') {
    return 'health'
  }
  if (
    a === 'cinema' ||
    a === 'theatre' ||
    a === 'arts_centre' ||
    a === 'library' ||
    a === 'community_centre' ||
    to === 'museum' ||
    to === 'gallery'
  ) {
    return 'culture'
  }
  if (a === 'place_of_worship') return 'worship'
  if (l === 'fitness_centre' || l === 'sports_centre' || a === 'gym') return 'gyms'
  if (l === 'park' || l === 'garden' || l === 'nature_reserve') return 'parks'
  if (l === 'playground') return 'playgrounds'
  if (
    s === 'supermarket' ||
    s === 'convenience' ||
    s === 'greengrocer' ||
    s === 'grocery' ||
    a === 'marketplace'
  ) {
    return 'supermarkets'
  }
  if (rw === 'station' || rw === 'tram_stop' || pt === 'station' || a === 'bus_station') {
    return 'transit'
  }
  return null
}

function asNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// Group raw Overpass elements into categories (port of OverpassPoiService._group)
// hardened: coordinates must be finite, distance must compute finite, per-kind
// lists sorted nearest-first and capped at MAX_PER_KIND.
function group(elements: unknown[], lat: number, lon: number): NearbyByKind {
  const out: NearbyByKind = {}
  const seen = new Set<string>()
  for (const e of elements) {
    if (!e || typeof e !== 'object') continue
    const el = e as Record<string, unknown>
    const tags = el['tags']
    if (!tags || typeof tags !== 'object') continue
    const t = tags as Record<string, unknown>
    const cat = category(t)
    if (cat == null) continue
    // Overpass ways/relations carry `center`, nodes carry lat/lon — either may
    // be missing; drop anything without a usable finite coordinate.
    let plat = asNum(el['lat'])
    let plon = asNum(el['lon'])
    if (plat == null || plon == null) {
      const c = el['center']
      if (c && typeof c === 'object') {
        plat = asNum((c as Record<string, unknown>)['lat'])
        plon = asNum((c as Record<string, unknown>)['lon'])
      }
    }
    if (plat == null || plon == null) continue
    const name = String(t['name'] ?? t['name:he'] ?? t['name:en'] ?? t['brand'] ?? '').trim()
    // Dedupe across duplicate OSM objects (node + way for the same place).
    const key = `${cat}|${name === '' ? `${plat.toFixed(4)},${plon.toFixed(4)}` : name}`
    if (seen.has(key)) continue
    seen.add(key)
    const km = haversineKm(lat, lon, plat, plon)
    if (!Number.isFinite(km)) continue
    ;(out[cat] ??= []).push({ name, km, lat: plat, lon: plon, kind: cat })
  }
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => a.km - b.km)
    if (out[k].length > MAX_PER_KIND) out[k] = out[k].slice(0, MAX_PER_KIND)
  }
  return out
}

/**
 * Everything within `radiusM` metres, grouped by category key
 * (dining/gyms/parks/…), nearest-first, ≤ MAX_PER_KIND per category.
 *
 * Resolves {} when the area genuinely has no POIs. Throws NearbyError when
 * every mirror failed, and the abort reason when `signal` aborts.
 */
export async function fetchNearby(
  lat: number,
  lon: number,
  radiusM = 2000,
  signal?: AbortSignal,
): Promise<NearbyByKind> {
  if (!finite(lat, lon)) return {}
  const query = buildQuery(lat, lon, radiusM)

  // Fast path: the site's own /api/nearby proxy — server-side grid cache (7d,
  // shared across ALL visitors) so a warm cell answers in tens of ms instead
  // of a 2-25s public-mirror round-trip. Falls through to direct mirrors.
  try {
    const res = await fetch('/api/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ lat, lon, query }),
      signal,
    })
    if (res.ok) {
      const body: unknown = await res.json()
      const elements = (body as Record<string, unknown>)?.['elements']
      if (Array.isArray(elements)) return group(elements, lat, lon)
    }
  } catch (err) {
    if (signal?.aborted) throw err
    // proxy unavailable → direct mirrors below
  }

  for (const ep of ENDPOINTS) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('aborted', 'AbortError')
    const ctrl = new AbortController()
    const onAbort = () => ctrl.abort(signal?.reason)
    signal?.addEventListener('abort', onAbort, { once: true })
    const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'TimeoutError')), 30_000)
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: query,
        signal: ctrl.signal,
      })
      if (!res.ok) continue
      const body: unknown = await res.json()
      if (!body || typeof body !== 'object') continue
      const elements = (body as Record<string, unknown>)['elements']
      if (!Array.isArray(elements)) continue
      return group(elements, lat, lon)
    } catch (err) {
      // Caller-initiated abort must propagate; anything else → next mirror.
      if (signal?.aborted) throw err
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }
  throw new NearbyError()
}

// ---------------------------------------------------------------------------
// Cached + deduped loader for UI use.
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'kz-nearby:'

function cacheKey(lat: number, lon: number): string {
  return `${CACHE_PREFIX}${lat.toFixed(3)},${lon.toFixed(3)}`
}

function readCache(key: string): NearbyByKind | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const out: NearbyByKind = {}
    for (const [kind, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(list)) return null
      const places: NearbyPlace[] = []
      for (const p of list) {
        if (!p || typeof p !== 'object') continue
        const q = p as Record<string, unknown>
        const km = asNum(q['km'])
        const plat = asNum(q['lat'])
        const plon = asNum(q['lon'])
        if (km == null || plat == null || plon == null) continue
        places.push({
          name: typeof q['name'] === 'string' ? q['name'] : '',
          km,
          lat: plat,
          lon: plon,
          kind,
        })
      }
      if (places.length > 0) out[kind] = places
    }
    return out
  } catch {
    return null // unreadable / corrupt / storage unavailable
  }
}

function writeCache(key: string, data: NearbyByKind): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {
    // quota / privacy mode — cache is best-effort only
  }
}

type InflightEntry = { promise: Promise<NearbyByKind>; refs: number; ctrl: AbortController }

const inflight = new Map<string, InflightEntry>()

/**
 * UI entry point: sessionStorage-cached, strict-mode-safe nearby lookup.
 *
 * Concurrent callers for the same rounded lat/lon share ONE Overpass request;
 * the underlying fetch aborts only when EVERY subscriber has released (so a
 * strict-mode double mount-unmount-mount doesn't kill its own request).
 *
 * Returns { promise, release } — always call release() on unmount.
 */
export function loadNearby(
  lat: number,
  lon: number,
): { promise: Promise<NearbyByKind>; release: () => void } {
  if (!finite(lat, lon)) {
    return { promise: Promise.resolve({}), release: () => {} }
  }
  const key = cacheKey(lat, lon)

  const cached = readCache(key)
  if (cached) {
    return { promise: Promise.resolve(cached), release: () => {} }
  }

  let entry = inflight.get(key)
  if (!entry) {
    const ctrl = new AbortController()
    const promise = fetchNearby(lat, lon, 2000, ctrl.signal)
      .then((data) => {
        writeCache(key, data)
        return data
      })
      .finally(() => {
        if (inflight.get(key) === entry) inflight.delete(key)
      })
    entry = { promise, refs: 0, ctrl }
    inflight.set(key, entry)
  }
  entry.refs += 1

  let released = false
  const release = () => {
    if (released || !entry) return
    released = true
    entry.refs -= 1
    if (entry.refs <= 0) {
      // Grace period before aborting: a React strict-mode remount re-subscribes
      // synchronously after cleanup, and must reuse this same request instead
      // of killing it and starting a duplicate.
      setTimeout(() => {
        if (entry.refs <= 0 && inflight.get(key) === entry) {
          inflight.delete(key)
          entry.ctrl.abort(new DOMException('released', 'AbortError'))
        }
      }, 150)
    }
  }
  return { promise: entry.promise, release }
}
