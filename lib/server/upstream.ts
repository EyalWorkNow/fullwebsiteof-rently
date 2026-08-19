// Server-only upstream helpers for SEO surfaces (generateMetadata, sitemap).
//
// Mirrors app/api/listings/route.ts: same prod API base and the same anonymous
// Firebase token minting. Kept separate from lib/live/api.ts, which is a
// 'use client' module built around the browser Firebase session and the
// same-origin /api/rently rewrite — neither exists during server rendering.
// Everything here fails soft (null / []) so metadata and the sitemap always
// degrade to sensible defaults instead of erroring the page.

import type { Property } from '@/lib/live/types'

const UPSTREAM = 'https://g7b9nx11sk.execute-api.us-east-1.amazonaws.com/prod'
const FIREBASE_KEY = 'AIzaSyDRxWwbIw0x-pv-8HAtfo3n0RSgK3mdJbM' // public web client key

const TOKEN_TTL_MS = 50 * 60_000
const FETCH_TIMEOUT_MS = 8_000

let tokenCache: { token: string; ts: number } | null = null

async function anonToken(): Promise<string | null> {
  if (tokenCache && Date.now() - tokenCache.ts < TOKEN_TTL_MS) return tokenCache.token
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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

// Same DB quirk the app's fromJson handles: list fields can arrive JSON-encoded.
function coerceList<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[]
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/** GET /properties/<id> — full single listing, or null on any failure. */
export async function fetchPropertyServer(id: string): Promise<Property | null> {
  try {
    const token = await anonToken()
    const res = await fetch(`${UPSTREAM}/properties/${encodeURIComponent(id)}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 600 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const raw: Property | null = data.item ?? data.property ?? (data.id ? data : null)
    if (!raw?.id) return null
    return {
      ...raw,
      media: coerceList(raw.media),
      imageUrls: coerceList(raw.imageUrls),
      smartTags: coerceList(raw.smartTags),
    }
  } catch {
    return null
  }
}

/** Active listing ids for the sitemap — capped, [] on any failure. */
export async function fetchActivePropertyIds(cap = 300): Promise<string[]> {
  try {
    const token = await anonToken()
    // rank=0 skips the upstream's per-listing rank decoration (~15ms/row).
    const res = await fetch(`${UPSTREAM}/properties?status=active&limit=${cap}&order=desc&rank=0`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    const items: unknown[] = data.items ?? (Array.isArray(data) ? data : [])
    return items
      .map((p) => (p as { id?: unknown })?.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .slice(0, cap)
  } catch {
    return []
  }
}
