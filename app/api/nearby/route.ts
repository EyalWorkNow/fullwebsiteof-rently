import { NextRequest, NextResponse } from 'next/server'

// Server-side Overpass proxy with a grid-keyed cache. The browser used to hit
// public Overpass mirrors directly — slow (2-25s) and easily rate-limited per
// user. Here one fetch serves every visitor of the same ~110m grid cell for a
// week (neighbourhoods change slowly), and the response is CDN-cacheable too.

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

// Overpass answers 406 Not Acceptable to a request with no User-Agent, and
// Node's fetch sends none by default — so every proxied call failed until this
// was set. (The app's Lambda has always sent one; see neighborhood.mjs.)
const UA =
  'RentlyWeb/1.0 (+https://rently.co.il; neighbourhood places; attribution: OpenStreetMap)'
const TTL_MS = 7 * 24 * 60 * 60_000
const MAX_CELLS = 500 // LRU-ish cap so a crawler can't balloon memory

const cache = new Map<string, { body: unknown; ts: number }>()

async function fetchMirror(url: string, query: string, signal: AbortSignal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      Accept: 'application/json',
    },
    body: 'data=' + encodeURIComponent(query),
    signal,
    // Opt out of Next's patched/instrumented fetch. Without this the same
    // request that Node answers in ~2-4s stalls here until Overpass 504s —
    // we cache the result ourselves, so its cache layer buys nothing.
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data?.elements)) throw new Error('bad payload')
  return data
}

export async function POST(req: NextRequest) {
  let query: string
  let lat: number, lon: number
  try {
    const body = await req.json()
    query = String(body.query || '')
    lat = Number(body.lat)
    lon = Number(body.lon)
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  if (!query || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  // Only allow Overpass-QL our client actually sends (defense: no SSRF params,
  // the query goes only to the fixed mirrors anyway; cap size).
  if (query.length > 4000) return NextResponse.json({ error: 'query too large' }, { status: 413 })

  const key = `${lat.toFixed(3)},${lon.toFixed(3)}:${query.length}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return NextResponse.json(hit.body, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=604800' },
    })
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 28_000)
  try {
    // Public Overpass allows ~2 concurrent slots, so a busy moment answers 429
    // (or an XML error page). One short-backoff retry turns most of those into
    // a success instead of showing the user an error card.
    let data: unknown
    try {
      data = await Promise.any(MIRRORS.map((m) => fetchMirror(m, query, ctrl.signal)))
    } catch (e1) {
      console.warn('[nearby] retrying after:',
        (e1 as AggregateError).errors?.map((x: Error) => x.message) ?? (e1 as Error).message)
      await new Promise((r) => setTimeout(r, 1500))
      data = await Promise.any(MIRRORS.map((m) => fetchMirror(m, query, ctrl.signal)))
    }
    if (cache.size >= MAX_CELLS) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      if (oldest) cache.delete(oldest[0])
    }
    cache.set(key, { body: data, ts: Date.now() })
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=604800' },
    })
  } catch {
    if (hit) return NextResponse.json(hit.body) // stale beats nothing
    return NextResponse.json({ error: 'overpass unavailable' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
