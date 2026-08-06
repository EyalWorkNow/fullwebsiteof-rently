'use client'

// Publisher inbox — candidates (tenants who liked a listing, not yet matched)
// and active match threads. Same VERIFIED contracts as ezra-api.ts/portal-api.ts:
// POST /match/leads ranks a landlord's incoming likes with the two-sided scorer
// (router.mjs handleMatchLeads); approving one POSTs to /matches with the app's
// exact id scheme (match-<propertyId>~<tenantUid>) so the tenant's own app sees
// the same match; GET/POST /messages is the same REST fallback the app's
// RealtimeChatService uses (matchId/senderId/text/createdAt) — no WebSocket
// here, a landlord replying from the website doesn't need live push.

import { getToken } from '@/lib/live/firebase'

const BASE = '/api/rently'

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export interface Lead {
  tenantId: string
  tenantName: string
  propertyId: string
  propertyTitle: string
  score: number
  excluded: boolean
  reasons: string[]
  conflicts: string[]
  likedAt: string | null
}

/** Ranked tenants who liked one of the caller's properties and aren't matched yet. */
export async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch(`${BASE}/match/leads`, {
    method: 'POST',
    headers: await authHeaders(),
    body: '{}',
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  return Array.isArray(data?.leads) ? data.leads : []
}

export interface MatchRow {
  id: string
  propertyId: string
  tenantUid: string
  landlordUid?: string
  createdAt?: string
  /** Which side of this account the match belongs to — a single login can be
   *  both a landlord (properties they publish) and a tenant (properties they
   *  search for), and those are two unrelated conversation lists. */
  role: 'landlord' | 'tenant'
}

/** landlordUid/tenantUid is server-stamped on write, and the read is gated to
 *  "mine" — see router.mjs's per-caller matches filter. A single account can
 *  be both a landlord and a tenant, but those are two unrelated conversation
 *  lists shown on two separate pages — the caller picks which side to fetch. */
export async function fetchMatches(uid: string, role: 'landlord' | 'tenant'): Promise<MatchRow[]> {
  const key = role === 'landlord' ? 'landlordUid' : 'tenantUid'
  const res = await fetch(`${BASE}/matches?${key}=${encodeURIComponent(uid)}`, { headers: await authHeaders() })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const items: MatchRow[] = Array.isArray(data?.items) ? data.items : []
  return items.map((m) => ({ ...m, role }))
}

/** Same matchId format the app's _createMatch uses, so both sides see one thread. */
export function matchIdFor(propertyId: string, tenantId: string): string {
  return `match-${propertyId}~${tenantId}`
}

export async function approveLead(propertyId: string, tenantId: string): Promise<void> {
  const res = await fetch(`${BASE}/matches`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ id: matchIdFor(propertyId, tenantId), propertyId, tenantUid: tenantId }),
  })
  if (!res.ok) throw new Error('אישור הפנייה נכשל. נסו שוב.')
}

export interface ChatMsg {
  id?: string
  matchId: string
  senderId: string
  senderName?: string
  text: string
  createdAt: string
}

export async function fetchThread(matchId: string): Promise<ChatMsg[]> {
  const res = await fetch(`${BASE}/messages?matchId=${encodeURIComponent(matchId)}`, {
    headers: await authHeaders(),
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const items: ChatMsg[] = Array.isArray(data?.items) ? data.items : []
  return items.slice().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
}

export async function sendThreadMessage(matchId: string, text: string): Promise<void> {
  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ matchId, text }),
  })
  if (!res.ok) throw new Error('שליחת ההודעה נכשלה. נסו שוב.')
}

// ── Dismissed leads — the app's own "reject" is local-only (a left-swipe never
// calls the server), so a rejection here is kept the same way: hidden on this
// device/account, never deleted server-side (the like itself is real history).
const DISMISS_KEY = 'rently-dismissed-leads'

function dismissedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function isDismissed(propertyId: string, tenantId: string): boolean {
  return dismissedSet().has(matchIdFor(propertyId, tenantId))
}

export function dismissLead(propertyId: string, tenantId: string): void {
  if (typeof window === 'undefined') return
  const set = dismissedSet()
  set.add(matchIdFor(propertyId, tenantId))
  window.localStorage.setItem(DISMISS_KEY, JSON.stringify([...set]))
}
