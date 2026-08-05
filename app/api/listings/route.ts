import { NextResponse } from 'next/server'

// Server-side listings cache. The client used to wait for Firebase anon init
// (~1-2s) before it could even start the API fetch — here the server mints the
// anon token itself via the identitytoolkit REST API (cached ~50min) and holds
// the listing payload for 60s, so the browser gets data in one fast round-trip.

const UPSTREAM = 'https://g7b9nx11sk.execute-api.us-east-1.amazonaws.com/prod'
const FIREBASE_KEY = 'AIzaSyCDcwTR549WF4TG-Uezjrpa8oB9y7cO2-M' // public client key

const LISTINGS_TTL_MS = 60_000
const TOKEN_TTL_MS = 50 * 60_000

let tokenCache: { token: string; ts: number } | null = null
let listingsCache: { body: unknown; ts: number } | null = null
let inflight: Promise<unknown> | null = null

async function anonToken(): Promise<string | null> {
  if (tokenCache && Date.now() - tokenCache.ts < TOKEN_TTL_MS) return tokenCache.token
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }),
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.idToken) return null
    tokenCache = { token: data.idToken, ts: Date.now() }
    return data.idToken
  } catch {
    return null
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

async function loadListings(): Promise<unknown> {
  const token = await anonToken()
  const res = await fetch(`${UPSTREAM}/properties?status=active&limit=500&order=desc`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`upstream ${res.status}`)
  const data = await res.json()
  const items = (data.items ?? data ?? [])
    .filter((p: Record<string, unknown>) => p && p.id && typeof p.price === 'number')
    // Same DB quirk the app's fromJson handles: media/imageUrls/smartTags may
    // arrive as JSON-encoded strings — normalize once, server-side.
    .map((p: Record<string, unknown>) => ({
      ...p,
      media: coerceList(p.media),
      imageUrls: coerceList(p.imageUrls),
      smartTags: coerceList(p.smartTags),
    }))
  if (!items.length) throw new Error('empty upstream')
  return { items, live: true }
}

export async function GET() {
  if (listingsCache && Date.now() - listingsCache.ts < LISTINGS_TTL_MS) {
    return NextResponse.json(listingsCache.body, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
    })
  }
  try {
    inflight ??= loadListings()
    const body = await inflight
    listingsCache = { body, ts: Date.now() }
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (e) {
    // Serve stale on upstream failure rather than an error — honesty flag stays true
    // because the data really is from the live API, just slightly old.
    if (listingsCache) return NextResponse.json(listingsCache.body)
    return NextResponse.json({ items: [], live: false, error: (e as Error).message }, { status: 502 })
  } finally {
    inflight = null
  }
}
