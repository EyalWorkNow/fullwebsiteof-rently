import { NextResponse } from 'next/server'

// Server-side listings cache.
//
// Why this exists: the upstream /properties call costs ~3.5s (a fixed ~1.4s of
// API-GW/Lambda/DDB/trans-Atlantic plus ~15ms per listing of server-side rank
// decoration the web never uses — it ranks locally with the ported SmartSearch).
// So we pay that cost rarely and never on the visitor's critical path:
//   • FRESH  (<10min)  → served from memory, ~5ms
//   • STALE  (<6h)     → served instantly AND refreshed in the background
//   • COLD             → one upstream fetch, deduped across concurrent requests
// The cache is also warmed at server boot, so even the first visitor is fast.
//
// Payload is slimmed here too: rankSignals/rankFeatures/neighborhoodScore alone
// were 28% of the bytes, and media/imageUrls another 50% (largely duplicated).
// The listing page fetches the FULL row by id, so nothing is lost.

const UPSTREAM = 'https://g7b9nx11sk.execute-api.us-east-1.amazonaws.com/prod'
const FIREBASE_KEY = 'AIzaSyDRxWwbIw0x-pv-8HAtfo3n0RSgK3mdJbM' // public web client key

const FRESH_MS = 10 * 60_000
const STALE_MS = 6 * 60 * 60_000
const TOKEN_TTL_MS = 50 * 60_000
// Neither upstream fetch below used to carry a timeout, so a hung backend
// (cold Lambda that accepts the connection but never responds) blocked every
// concurrent visitor sharing `inflight` indefinitely — the skeleton grid had
// no ceiling to fall back from. See /api/nearby, which already guards this.
const FETCH_TIMEOUT_MS = 10_000

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal, cancel: () => clearTimeout(timer) }
}

// Heavy fields the card grid / filter engine / map never read. Dropping them is
// safe because /listing/<id> fetches the complete row separately.
const DROP_FIELDS = [
  'rankSignals',
  'rankFeatures',
  'neighborhoodScore',
  'marketSignals',
  'panoramaTour',
  'virtualTour',
  'legal',
  'priceHistory',
  'embedding',
  'sourceUrl',
  'description',
] as const

const MEDIA_KEEP = 3 // the card shows one image; keep a couple for safety

let tokenCache: { token: string; ts: number } | null = null
let cache: { body: unknown; ts: number } | null = null
let inflight: Promise<unknown> | null = null

async function anonToken(): Promise<string | null> {
  if (tokenCache && Date.now() - tokenCache.ts < TOKEN_TTL_MS) return tokenCache.token
  const { signal, cancel } = withTimeout(FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }),
        signal,
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.idToken) return null
    tokenCache = { token: data.idToken, ts: Date.now() }
    return data.idToken
  } catch {
    return null
  } finally {
    cancel()
  }
}

function coerceList(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}

function slim(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p }
  for (const f of DROP_FIELDS) delete out[f]

  // media/imageUrls hold overlapping image URLs — keep whichever is populated,
  // trimmed, and drop the redundant twin.
  const media = coerceList(p.media)
  const imageUrls = coerceList(p.imageUrls)
  if (media.length) {
    out.media = media.slice(0, MEDIA_KEEP)
    delete out.imageUrls
  } else {
    delete out.media
    out.imageUrls = imageUrls.slice(0, MEDIA_KEEP)
  }
  // Same DB quirk the app's fromJson handles: these can arrive JSON-encoded.
  out.smartTags = coerceList(p.smartTags)
  return out
}

async function loadListings(): Promise<unknown> {
  const token = await anonToken()
  const { signal, cancel } = withTimeout(FETCH_TIMEOUT_MS)
  try {
    // rank=0 asks the router to skip its per-listing rank decoration (~15ms/row).
    // Unknown params are ignored by older deployments, so this is safe either way.
    const res = await fetch(`${UPSTREAM}/properties?status=active&limit=500&order=desc&rank=0`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      signal,
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const data = await res.json()
    const items = (data.items ?? data ?? [])
      .filter((p: Record<string, unknown>) => p && p.id && typeof p.price === 'number')
      .map(slim)
    if (!items.length) throw new Error('empty upstream')
    return { items, live: true }
  } finally {
    cancel()
  }
}

function refresh(): Promise<unknown> {
  inflight ??= loadListings()
    .then((body) => {
      cache = { body, ts: Date.now() }
      return body
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

const HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=21600',
}

export async function GET() {
  const age = cache ? Date.now() - cache.ts : Infinity

  if (age < FRESH_MS) return NextResponse.json(cache!.body, { headers: HEADERS })

  if (age < STALE_MS) {
    void refresh().catch(() => {}) // background — the visitor never waits
    return NextResponse.json(cache!.body, { headers: HEADERS })
  }

  try {
    return NextResponse.json(await refresh(), { headers: HEADERS })
  } catch (e) {
    if (cache) return NextResponse.json(cache.body, { headers: HEADERS }) // stale beats nothing
    return NextResponse.json({ items: [], live: false, error: (e as Error).message }, { status: 502 })
  }
}

// Warm at boot so the first visitor doesn't pay the cold cost either.
void refresh().catch(() => {})
