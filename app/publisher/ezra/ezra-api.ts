'use client'

// עזרא (publisher assistant) API layer.
//
// Same VERIFIED contracts app/publisher/portal-api.ts uses — copied, not imported,
// so the publisher workspace owns its own surface (portal-api.ts stays exactly
// as it is for the landlord tab):
// • Chat:    POST /assistant {messages:[{role,text}]} — NO mode field (only the
//            tenant search sends mode:'tenant_search'). Reply may be
//            {data:{…}}-wrapped: {reply, propertyDraft, suggestions, listings}.
//            The listings the assistant already returns are surfaced here as
//            inline cards (the app drops them).
// • Publish: PUT /properties/{id} with the full app row (property_repository
//            _propertyToRow) — 23 feat_* booleans + the legal consent record.
//            The one addition over portal-api: `condition` comes from the draft
//            card instead of being hard-coded, because the canonical web draft
//            has a "מצב הנכס" field.

import { getToken } from '@/lib/live/firebase'
import type { ChatTurn, Property } from '@/lib/live/types'

const BASE = '/api/rently'

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const str = (v: unknown) => (v == null ? '' : String(v).trim())

const coerceList = <T,>(v: unknown): T[] => {
  if (Array.isArray(v)) return v as T[]
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

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface EzraReply {
  reply: string
  propertyDraft: Record<string, unknown> | null
  /** Server hard-caps at 5; we cap again so a looser build can't flood the UI. */
  suggestions: string[]
  listings: Property[]
}

export async function ezraChat(turns: ChatTurn[]): Promise<EzraReply> {
  const res = await fetch(`${BASE}/assistant`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ messages: turns.slice(-12) }),
  })
  if (res.status === 401 || res.status === 403) throw new Error('צריך להתחבר כדי לדבר עם עזרא.')
  if (!res.ok) throw new Error('עזרא אינו זמין כרגע. נסו שוב בעוד רגע.')
  const decoded = await res.json()
  const data =
    decoded && typeof decoded === 'object' && decoded.data && typeof decoded.data === 'object'
      ? decoded.data
      : decoded
  const draft = data?.propertyDraft
  const sugg = data?.suggestions
  const rawListings = data?.listings ?? data?.cards ?? data?.results ?? []
  return {
    reply:
      typeof data?.reply === 'string' && data.reply.trim()
        ? data.reply.trim()
        : 'סליחה, לא הבנתי. אפשר לחזור על זה?',
    propertyDraft:
      draft && typeof draft === 'object' && !Array.isArray(draft)
        ? (draft as Record<string, unknown>)
        : null,
    suggestions: (Array.isArray(sugg) ? sugg.map((s) => String(s)).filter(Boolean) : []).slice(0, 5),
    listings: (Array.isArray(rawListings) ? rawListings : [])
      .filter((p: Property) => p && p.id)
      .map((p: Property) => ({
        ...p,
        media: coerceList(p.media),
        imageUrls: coerceList(p.imageUrls),
        smartTags: coerceList(p.smartTags),
      })),
  }
}

// ── The live draft (canonical 9-field web version) ───────────────────────────

export interface EzraDraftFields {
  city: string
  /** "רחוב ומספר" as one line — split back into street/streetNumber on publish. */
  streetLine: string
  rooms: string
  sizeM2: string
  floor: string
  price: string
  transactionType: 'rent' | 'sale'
  condition: string
  description: string
}

export type DraftKey = keyof EzraDraftFields

export const DRAFT_KEYS: DraftKey[] = [
  'city',
  'streetLine',
  'rooms',
  'sizeM2',
  'floor',
  'price',
  'transactionType',
  'condition',
  'description',
]

export const CONDITIONS = ['חדש', 'משופץ', 'תקין', 'דורש שיפוץ']

export const EMPTY_DRAFT: EzraDraftFields = {
  city: '',
  streetLine: '',
  rooms: '',
  sizeM2: '',
  floor: '',
  price: '',
  transactionType: 'rent',
  condition: 'תקין',
  description: '',
}

/** Only the values the assistant actually said — never a default that would
 *  overwrite something already on the card. */
function draftPatch(raw: Record<string, unknown>): Partial<EzraDraftFields> {
  const patch: Partial<EzraDraftFields> = {}
  const city = str(raw.city)
  if (city) patch.city = city

  const line = [str(raw.street), str(raw.streetNumber)].filter(Boolean).join(' ').trim()
  if (line) patch.streetLine = line

  const rooms = str(raw.rooms)
  if (rooms) patch.rooms = rooms

  const sizeM2 = str(raw.sizeM2 ?? raw.size)
  if (sizeM2) patch.sizeM2 = sizeM2

  const floor = str(raw.floor)
  if (floor) patch.floor = floor

  const price = str(raw.price).replace(/[^\d]/g, '')
  if (price) patch.price = price

  const tx = str(raw.transactionType).toLowerCase()
  if (tx) patch.transactionType = tx === 'sale' || tx.includes('מכיר') ? 'sale' : 'rent'

  const condition = str(raw.condition)
  if (condition) patch.condition = condition

  const description = str(raw.description ?? raw.notes)
  if (description) patch.description = description

  return patch
}

/**
 * Merge rule: a new server draft wins on every field EXCEPT the ones the
 * landlord has typed into (`dirty`) — those are theirs from then on. A field the
 * assistant simply didn't mention keeps its current value (an absent value never
 * blanks the card).
 */
export function mergeDraft(
  prev: EzraDraftFields | null,
  raw: Record<string, unknown>,
  dirty: DraftKey[],
): EzraDraftFields {
  const base = prev ?? EMPTY_DRAFT
  const patch = draftPatch(raw)
  const pick = <K extends DraftKey>(k: K): EzraDraftFields[K] => {
    if (dirty.includes(k)) return base[k]
    const v = patch[k]
    return v === undefined || v === '' ? base[k] : (v as EzraDraftFields[K])
  }
  return {
    city: pick('city'),
    streetLine: pick('streetLine'),
    rooms: pick('rooms'),
    sizeM2: pick('sizeM2'),
    floor: pick('floor'),
    price: pick('price'),
    transactionType: pick('transactionType'),
    condition: pick('condition'),
    description: pick('description'),
  }
}

// ── Publish ──────────────────────────────────────────────────────────────────

// Best-effort geocode (the app uses the platform geocoder with a TLV-centre
// fallback — mirrored here with Nominatim + the same fallback).
async function geocode(street: string, num: string, city: string): Promise<{ lat: number; lon: number }> {
  const fallback = { lat: 32.0853, lon: 34.7818 }
  const parts = [street, num, city, 'ישראל'].filter(Boolean)
  if (parts.length < 2) return fallback
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 6000)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(parts.join(', '))}`,
      { signal: ctl.signal, headers: { Accept: 'application/json' } },
    )
    clearTimeout(t)
    const arr = await res.json()
    if (Array.isArray(arr) && arr[0]?.lat) {
      return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) }
    }
  } catch {
    /* keep fallback */
  }
  return fallback
}

// All 23 feature columns the app writes explicitly (server-side filter parity).
const FEAT_KEYS = [
  'balcony', 'parking', 'storage', 'airConditioning', 'mamad', 'sunBalcony', 'garden',
  'elevator', 'furnished', 'internetIncluded', 'equippedKitchen', 'petsAllowed',
  'laundryIncluded', 'security', 'accessible', 'sharedRoof', 'pool', 'gym', 'bars',
  'renovated', 'roommates', 'bombShelter', 'safeFloorSpace',
]

/** "הרצל 42" → { street: 'הרצל', streetNumber: 42 }. */
export function splitStreetLine(line: string): { street: string; streetNumber: number } {
  const m = line.trim().match(/^(.*?)[\s,]*(\d+)\s*$/)
  if (!m) return { street: line.trim(), streetNumber: -1 }
  return { street: m[1].trim(), streetNumber: parseInt(m[2], 10) || -1 }
}

export async function publishDraft(
  fields: EzraDraftFields,
  ownerUserId: string,
  ownerName: string,
): Promise<{ id: string }> {
  const price = parseInt(fields.price, 10) || 0
  const rooms = parseFloat(fields.rooms) || 3
  const sizeM2 = parseInt(fields.sizeM2, 10) || 0
  const { street, streetNumber } = splitStreetLine(fields.streetLine)
  if (!fields.city.trim()) throw new Error('חסרה עיר — אי אפשר לפרסם בלי כתובת.')
  if (price <= 0) throw new Error('חסר מחיר — אי אפשר לפרסם בלי מחיר.')

  const { lat, lon } = await geocode(street, streetNumber > 0 ? String(streetNumber) : '', fields.city.trim())

  const id = `custom-${Date.now()}`
  const nowIso = new Date().toISOString()
  const dateOnly = nowIso.slice(0, 10)

  const row: Record<string, unknown> = {
    id,
    propertyId: id,
    ownerUserId,
    sourceUrl: '',
    price,
    rooms,
    sizeM2,
    floor: fields.floor.trim(),
    totalFloors: '',
    city: fields.city.trim(),
    neighborhood: '',
    street,
    streetNumber,
    lat,
    lon,
    propertyType: 'דירה',
    entryDate: '',
    condition: fields.condition.trim() || 'תקין',
    ownerName: ownerName.trim() || 'בעל הדירה',
    agencyListing: false,
    description: fields.description.trim(),
    features: JSON.stringify(Object.fromEntries(FEAT_KEYS.map((k) => [k, false]))),
    featureLabels: JSON.stringify([]),
    ...Object.fromEntries(FEAT_KEYS.map((k) => [`feat_${k}`, false])),
    media: JSON.stringify([]),
    transactionType: fields.transactionType,
    status: 'active',
    createdAt: nowIso,
    model3d: '',
    // The landlord confirmed the details on the draft card before publishing —
    // same consent record shape LegalConsentService.grantConsent produces.
    legal: JSON.stringify({
      thirdPartyTransferAllowed: false,
      commercialSaleAllowed: false,
      aiTrainingAllowed: false,
      consentVersion: 'v1.0',
      consentTimestamp: nowIso,
      consentSource: 'web_landlord_portal',
    }),
    priceHistory: JSON.stringify(
      price > 0 ? [{ date: dateOnly, price, transactionType: fields.transactionType }] : [],
    ),
    marketSignals: JSON.stringify({}),
    verification: JSON.stringify({}),
    verifiedListing: false,
    verificationMethod: '',
    verificationVideoUrl: '',
    verifiedAt: '',
    virtualTour: '',
    panoramaTour: '',
    tourStatus: 'none',
    tourViewerUrl: '',
    tourProvider: '',
    updatedAt: nowIso,
  }

  const res = await fetch(`${BASE}/properties/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`הפרסום נכשל (שגיאה ${res.status}). נסו שוב בעוד רגע.`)
  return { id }
}
