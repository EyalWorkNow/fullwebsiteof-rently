// Live, COMPREHENSIVE nearby-POI lookup from OpenStreetMap via the Overpass API.
//
// Direct port of the app's lib/core/services/overpass_poi_service.dart — SAME
// query (tags, radius, cap), same category grouping, same dedupe + nearest-first
// sorting — so the website's listing page shows the same geo intelligence as the
// app's property page. Fail-soft: any error → empty map (the section hides).

export interface NearbyPlace {
  name: string
  km: number
  lat: number
  lon: number
  kind: string
}

export type NearbyByKind = Record<string, NearbyPlace[]>

const EARTH_RADIUS_KM = 6371.0088

const rad = (d: number) => (d * Math.PI) / 180

/** Haversine great-circle distance in km (port of IsraelGeoIndex.haversineKm). */
export function haversineKm(la1: number, lo1: number, la2: number, lo2: number): number {
  const dLa = rad(la2 - la1)
  const dLo = rad(lo2 - lo1)
  const a =
    Math.sin(dLa / 2) * Math.sin(dLa / 2) +
    Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLo / 2) * Math.sin(dLo / 2)
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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

// Group raw Overpass elements into categories (port of OverpassPoiService._group).
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
    ;(out[cat] ??= []).push({ name, km, lat: plat, lon: plon, kind: cat })
  }
  for (const l of Object.values(out)) {
    l.sort((a, b) => a.km - b.km)
  }
  return out
}

/**
 * Everything within `radiusM` metres, grouped by category key
 * (dining/gyms/parks/…), sorted nearest-first within each category.
 * Fail-soft: any error on both mirrors → empty map.
 */
export async function fetchNearby(
  lat: number,
  lon: number,
  radiusM = 2000,
): Promise<NearbyByKind> {
  const query = buildQuery(lat, lon, radiusM)
  for (const ep of ENDPOINTS) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30_000)
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
    } catch {
      // try the next mirror
    } finally {
      clearTimeout(timer)
    }
  }
  return {}
}

/** Distance label — exact port of the app card's _distLabel. */
export function distLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} מ׳` : `${km.toFixed(1)} ק״מ`
}
