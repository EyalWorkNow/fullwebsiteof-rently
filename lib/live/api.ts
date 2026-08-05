'use client'

import { getToken } from './firebase'
import { SAMPLE_PROPERTIES } from './sample'
import type { ChatTurn, Property } from './types'

// Same-origin rewrite (next.config.ts) proxies to the prod API — no CORS.
const BASE = '/api/rently'

// Accepts an array, a JSON-encoded array string, or garbage — always returns an array.
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

export interface PropertiesResult {
  items: Property[]
  live: boolean // true = real API, false = sample fallback
}

// GET /properties?status=active — falls back to sample data on any auth/network
// failure so the site is never empty.
export async function fetchProperties(limit = 60): Promise<PropertiesResult> {
  try {
    const token = await getToken()
    const res = await fetch(`${BASE}/properties?status=active&limit=${limit}&order=desc`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const items: Property[] = (data.items ?? data ?? [])
      .filter((p: Property) => p && p.id && typeof p.price === 'number')
      // Some DB rows store media/imageUrls/smartTags as JSON-encoded strings —
      // same quirk the app's fromJson handles. Normalize so the UI always sees arrays.
      .map((p: Property) => ({
        ...p,
        media: coerceList(p.media),
        imageUrls: coerceList(p.imageUrls),
        smartTags: coerceList(p.smartTags),
      }))
    if (!items.length) throw new Error('no items')
    return { items, live: true }
  } catch (e) {
    console.warn('[api] properties fell back to sample:', (e as Error).message)
    return { items: SAMPLE_PROPERTIES, live: false }
  }
}

// GET /properties/<id> — single listing (same endpoint the app's share-link uses).
// Falls back to the sample list so /listing/s1 etc. always work.
export async function fetchPropertyById(id: string): Promise<{ item: Property | null; live: boolean }> {
  try {
    const token = await getToken()
    const res = await fetch(`${BASE}/properties/${encodeURIComponent(id)}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const raw: Property | null = data.item ?? data.property ?? (data.id ? data : null)
    if (!raw?.id) throw new Error('no item')
    return {
      item: {
        ...raw,
        media: coerceList(raw.media),
        imageUrls: coerceList(raw.imageUrls),
        smartTags: coerceList(raw.smartTags),
      },
      live: true,
    }
  } catch (e) {
    console.warn('[api] property-by-id fell back to sample:', (e as Error).message)
    return { item: SAMPLE_PROPERTIES.find((p) => p.id === id) ?? null, live: false }
  }
}

export interface AtiSearchResult {
  reply: string
  listings: Property[]
  live: boolean // false = local keyword fallback over the property list
}

// POST /assistant — אתי, single-turn "fast mode" (mode the app's tenant search uses).
// If the backend is unreachable/unauthorized, falls back to a local keyword match
// over the live property list so search always returns something honest.
export async function atiFastSearch(query: string): Promise<AtiSearchResult> {
  try {
    const token = await getToken()
    const messages: ChatTurn[] = [{ role: 'user', text: query }]
    const res = await fetch(`${BASE}/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages, mode: 'tenant_search' }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rawListings = data.listings ?? data.results ?? data.data?.listings ?? []
    const listings: Property[] = (Array.isArray(rawListings) ? rawListings : [])
      .filter((p: Property) => p && p.id)
      .map((p: Property) => ({
        ...p,
        media: coerceList(p.media),
        imageUrls: coerceList(p.imageUrls),
        smartTags: coerceList(p.smartTags),
      }))
    const reply: string = data.reply ?? data.data?.reply ?? ''
    if (!reply && !listings.length) throw new Error('empty assistant response')
    // Fast mode: אתי sometimes answers with a follow-up question and no listings
    // on the first turn — backfill cards from a local match so results show NOW.
    if (!listings.length) {
      const local = await localKeywordSearch(query)
      return { reply, listings: local.listings, live: true }
    }
    return { reply, listings, live: true }
  } catch (e) {
    console.warn('[api] אתי fell back to local search:', (e as Error).message)
    return localKeywordSearch(query)
  }
}

// Minimal SmartSearch-style fallback: parse rooms / max price / city tokens from
// free Hebrew text and filter the property list locally.
// ponytail: naive parser — the real NLU lives in the backend; this only keeps the
// search bar useful when /assistant is unreachable.
async function localKeywordSearch(query: string): Promise<AtiSearchResult> {
  const { items } = await fetchProperties(300)
  const q = query.replace(/[,.!?]/g, ' ')
  const roomsMatch = q.match(/(\d+(?:\.\d+)?)\s*חדרים/)
  const priceMatch = q.match(/עד\s*([\d,]+)\s*(?:₪|שח|ש"ח)?/)
  const rooms = roomsMatch ? parseFloat(roomsMatch[1]) : null
  const maxPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : null
  const words = q.split(/\s+/).filter((w) => w.length >= 2)
  const matched = items.filter((p) => {
    if (rooms && (p.rooms ?? 0) < rooms) return false
    if (maxPrice && p.price > maxPrice) return false
    const hay = `${p.city ?? ''} ${p.neighborhood ?? ''} ${p.street ?? ''}`
    const cityHit = words.some((w) => hay.includes(w))
    return rooms || maxPrice ? true : cityHit
  })
  const listings = (matched.length ? matched : items).slice(0, 8)
  return {
    reply: matched.length
      ? `מצאתי ${matched.length} דירות שמתאימות לחיפוש שלך — הנה המובילות:`
      : 'לא מצאתי התאמה מדויקת, אבל הנה דירות פעילות שאולי יעניינו אותך:',
    listings,
    live: false,
  }
}

// Presentation helpers shared by the property card.
export function priceLabel(p: Property): string {
  const n = p.price.toLocaleString('he-IL')
  return p.transactionType === 'sale' ? `₪${n}` : `₪${n}/חודש`
}

export function primaryImage(p: Property): string | null {
  return p.media?.find((m) => !m.type || m.type.startsWith('image'))?.url ?? p.imageUrls?.[0] ?? null
}

export function addressLabel(p: Property): string {
  if (p.street) return `${p.street}${p.streetNumber ? ' ' + p.streetNumber : ''}`
  return p.neighborhood || p.city || 'דירה'
}

export function cityLabel(p: Property): string {
  return p.neighborhood ? `${p.city ?? ''}, ${p.neighborhood}` : (p.city ?? '')
}
