'use client'

// Publisher-portal API layer — mirrors EXACTLY what the Flutter app sends so
// everything the web writes/reads shows up in the app (same Firebase uid,
// same backend routes via the /api/rently same-origin proxy).
//
// Contracts (verified against the app source):
// • My listings: GET /properties?ownerUserId=<uid>&order=desc&limit=200
//   (rental_data_service.loadPropertiesByOwner), filter status !== 'removed'.
// • Viewing slots: owner-scoped broker-data blobs (broker_cloud_sync.dart):
//   PUT /broker_data/viewing_slots {data:'<json string>', updatedAt}
//   GET /broker_data/viewing_slots → {data:'<json string>'}
//   Row id is derived server-side as {callerUid}:{key}. If the route rejects
//   non-broker accounts we fall back to localStorage (honest badge in the UI).
//
// עזרא (the assistant, chat + publish) lives in ./ezra/ezra-api.ts — that is
// the canonical, most complete draft/publish contract; nothing here duplicates it.

import { getToken } from '@/lib/live/firebase'
import type { Property } from '@/lib/live/types'

const BASE = '/api/rently'

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
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
