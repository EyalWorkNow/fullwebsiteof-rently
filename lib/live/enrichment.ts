'use client'

import { getToken } from './firebase'

// Same-origin rewrite (next.config.ts) proxies to the prod API — no CORS.
const BASE = '/api/rently'

// The enrichment Lambda attaches these to a listing. Shapes mirror exactly what
// the app's Dart widgets read (price_badge.dart / neighborhood_score_card.dart),
// typed loosely because the payload lands before the model knows about it —
// numbers may arrive as strings, maps may be partial or absent.

// { "medianPpm": 28500, "deltaPct": -12, "badge": "great_deal" }
//   badge – great_deal | fair | above_market | insufficient_data (or unknown)
export interface PriceBadgeData {
  medianPpm?: number | string | null
  deltaPct?: number | string | null
  badge?: string | null
  [key: string]: unknown
}

// { "score": 84, "sub": { "safety": 88, "walkability": 82, "schools": 79,
//                         "transit": 71, "green": 64, ...unknown keys } }
export interface NeighborhoodScoreData {
  score?: number | string | null
  sub?: Record<string, unknown> | null
  [key: string]: unknown
}

export interface ListingEnrichment {
  priceBadge?: PriceBadgeData | null
  neighborhoodScore?: NeighborhoodScoreData | null
  [key: string]: unknown
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

// GET /listing/enrichment?listingId=<id> — flat map or {data:{...}} envelope.
// Fail-soft: returns null on any error, or when the payload carries neither
// priceBadge nor neighborhoodScore, so callers simply render nothing.
export async function fetchListingEnrichment(listingId: string): Promise<ListingEnrichment | null> {
  try {
    const token = await getToken()
    const res = await fetch(`${BASE}/listing/enrichment?listingId=${encodeURIComponent(listingId)}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw = asRecord(await res.json())
    if (!raw) return null
    // Unwrap the {data:{...}} envelope when present, else treat as flat.
    const map = asRecord(raw.data) ?? raw
    if (!asRecord(map.priceBadge) && !asRecord(map.neighborhoodScore)) return null
    return map as ListingEnrichment
  } catch (e) {
    console.warn('[enrichment] hidden (fail-soft):', (e as Error).message)
    return null
  }
}
