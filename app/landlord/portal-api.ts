'use client'

// Landlord-portal API layer — mirrors EXACTLY what the Flutter app sends so
// everything the web writes shows up in the app (same Firebase uid, same
// backend routes via the /api/rently same-origin proxy).
//
// Contracts (verified against the app source):
// • אריק chat: POST /assistant {messages:[{role,text}]} — NO mode field
//   (erik_chat_screen.dart calls _service.chat(history) with no mode; only the
//   tenant search sends mode:'tenant_search'). Reply may be {data:{…}}-wrapped:
//   {reply, propertyDraft, suggestions, …}.
// • Publish: PUT /properties/{id} with {id, …row} — the appwrite_client shim's
//   upsertRow, row shape from property_repository.dart _propertyToRow.
// • My listings: GET /properties?ownerUserId=<uid>&order=desc&limit=200
//   (rental_data_service.loadPropertiesByOwner), filter status !== 'removed'.
// • Viewing slots: owner-scoped broker-data blobs (broker_cloud_sync.dart):
//   PUT /broker_data/viewing_slots {data:'<json string>', updatedAt}
//   GET /broker_data/viewing_slots → {data:'<json string>'}
//   Row id is derived server-side as {callerUid}:{key}. If the route rejects
//   non-broker accounts we fall back to localStorage (honest badge in the UI).

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

// ── אריק (landlord assistant) ────────────────────────────────────────────────

export interface ErikReply {
  reply: string
  propertyDraft: Record<string, unknown> | null
  suggestions: string[]
}

export async function erikChat(turns: ChatTurn[]): Promise<ErikReply> {
  const res = await fetch(`${BASE}/assistant`, {
    method: 'POST',
    headers: await authHeaders(),
    // Same body as the app's AssistantService.chat for Erik: messages only.
    body: JSON.stringify({ messages: turns.slice(-12) }),
  })
  if (res.status === 401 || res.status === 403) throw new Error('צריך להתחבר כדי לדבר עם אריק.')
  if (!res.ok) throw new Error('אריק אינו זמין כרגע. נסו שוב בעוד רגע.')
  const decoded = await res.json()
  const data = (decoded && typeof decoded === 'object' && decoded.data && typeof decoded.data === 'object')
    ? decoded.data
    : decoded
  const draft = data?.propertyDraft
  const sugg = data?.suggestions
  return {
    reply: typeof data?.reply === 'string' && data.reply.trim() ? data.reply.trim() : 'סליחה, לא הבנתי. אפשר לחזור על זה?',
    propertyDraft: draft && typeof draft === 'object' && !Array.isArray(draft) ? (draft as Record<string, unknown>) : null,
    suggestions: Array.isArray(sugg) ? sugg.map((s) => String(s)).filter(Boolean) : [],
  }
}

// ── Draft → publish ──────────────────────────────────────────────────────────

export interface DraftFields {
  city: string
  street: string
  streetNumber: string
  rooms: string
  sizeM2: string
  floor: string
  price: string
  transactionType: 'rent' | 'sale'
  description: string
}

const str = (v: unknown) => (v == null ? '' : String(v).trim())

export function draftToFields(draft: Record<string, unknown>): DraftFields {
  const tx = str(draft.transactionType).toLowerCase()
  return {
    city: str(draft.city),
    street: str(draft.street),
    streetNumber: str(draft.streetNumber),
    rooms: str(draft.rooms),
    sizeM2: str(draft.sizeM2),
    floor: str(draft.floor),
    price: str(draft.price).replace(/[^\d]/g, ''),
    transactionType: tx === 'sale' || tx === 'למכירה' ? 'sale' : 'rent',
    description: str(draft.description ?? draft.notes ?? ''),
  }
}

// Best-effort geocode (the app uses the platform geocoder with a TLV-centre
// fallback — we mirror that with Nominatim + the same fallback).
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

export async function publishProperty(
  fields: DraftFields,
  ownerUserId: string,
  ownerName: string,
): Promise<{ id: string }> {
  const price = parseInt(fields.price, 10) || 0
  const rooms = parseFloat(fields.rooms) || 3
  const sizeM2 = parseInt(fields.sizeM2, 10) || 0
  const streetNumber = parseInt(fields.streetNumber, 10) || -1
  if (!fields.city.trim()) throw new Error('חסרה עיר — אי אפשר לפרסם בלי כתובת.')
  if (price <= 0) throw new Error('חסר מחיר — אי אפשר לפרסם בלי מחיר.')

  const { lat, lon } = await geocode(fields.street.trim(), streetNumber > 0 ? String(streetNumber) : '', fields.city.trim())

  const id = `custom-${Date.now()}`
  const nowIso = new Date().toISOString()
  const dateOnly = nowIso.slice(0, 10)

  // Row shape mirrors property_repository.dart _propertyToRow (JSON blobs are
  // stringified exactly like the app's jsonEncode calls).
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
    street: fields.street.trim(),
    streetNumber,
    lat,
    lon,
    propertyType: 'דירה',
    entryDate: '',
    condition: 'תקין',
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
    // The landlord confirmed the details in the portal before publishing —
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

// ── My properties ────────────────────────────────────────────────────────────

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

export async function fetchMyProperties(ownerUserId: string): Promise<Property[]> {
  const res = await fetch(
    `${BASE}/properties?ownerUserId=${encodeURIComponent(ownerUserId)}&order=desc&limit=200`,
    { headers: await authHeaders() },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const payload = await res.json()
  const rows = payload.items ?? payload.rows
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r: Property & { status?: string }) => r && (r.id || (r as { propertyId?: string }).propertyId) && r.status !== 'removed')
    .map((r: Property) => ({
      ...r,
      id: r.id ?? (r as { propertyId?: string }).propertyId ?? '',
      media: coerceList(r.media),
      imageUrls: coerceList(r.imageUrls),
    }))
}

// ── Viewing slots (calendar) ─────────────────────────────────────────────────

export interface ViewingSlot {
  id: string
  dateISO: string // YYYY-MM-DD
  time: string // HH:mm
  durationMin: number
  propertyId?: string
  note?: string
  tag?: string
  booked?: boolean
}

const SLOTS_DOC = 'viewing_slots'
const LOCAL_KEY = 'rently_web_viewing_slots'

function readLocal(): ViewingSlot[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.slots) ? parsed.slots : []
  } catch {
    return []
  }
}

function writeLocal(slots: ViewingSlot[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ slots }))
  } catch {
    /* storage full/blocked — nothing else to do */
  }
}

/** cloud=true means the broker_data route answered (cross-device sync works). */
export async function loadSlots(): Promise<{ slots: ViewingSlot[]; cloud: boolean }> {
  try {
    const res = await fetch(`${BASE}/broker_data/${SLOTS_DOC}`, { headers: await authHeaders() })
    if (res.status === 404) return { slots: readLocal(), cloud: true } // no doc yet — route works
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const payload = await res.json()
    const raw = payload?.data
    if (typeof raw === 'string' && raw) {
      const parsed = JSON.parse(raw)
      const slots: ViewingSlot[] = Array.isArray(parsed?.slots) ? parsed.slots : []
      writeLocal(slots) // local mirror, like the app's local-first pattern
      return { slots, cloud: true }
    }
    return { slots: readLocal(), cloud: true }
  } catch {
    return { slots: readLocal(), cloud: false }
  }
}

/** Returns true when the cloud accepted the write (else saved locally only). */
export async function saveSlots(slots: ViewingSlot[]): Promise<boolean> {
  writeLocal(slots) // local-first — never lose the landlord's calendar
  try {
    const res = await fetch(`${BASE}/broker_data/${SLOTS_DOC}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify({
        data: JSON.stringify({ slots }),
        updatedAt: new Date().toISOString(),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
