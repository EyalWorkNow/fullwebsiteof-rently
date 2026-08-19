'use client'

// Publisher inbox — candidates (tenants who liked a listing, not yet matched)
// and active match threads. Same VERIFIED contracts as ezra-api.ts/portal-api.ts:
// POST /match/leads ranks a landlord's incoming likes with the two-sided scorer
// (router.mjs handleMatchLeads); approving one POSTs to /matches with the app's
// exact id scheme (match-<propertyId>~<tenantUid>) so the tenant's own app sees
// the same match; GET/POST /messages is the same REST fallback the app's
// RealtimeChatService uses (matchId/senderId/text/createdAt) — no WebSocket
// here, a landlord replying from the website doesn't need live push.

import { currentUser, getToken } from '@/lib/live/firebase'

const BASE = '/api/rently'
const FETCH_TIMEOUT_MS = 10_000

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
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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
  const res = await fetch(`${BASE}/matches?${key}=${encodeURIComponent(uid)}`, {
    headers: await authHeaders(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
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
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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
  // Ask for the NEWEST page, like the app's RealtimeChatService does — the
  // router's default is oldest-first limit 150, which permanently hides every
  // new message once a thread outgrows the limit.
  const qs = `matchId=${encodeURIComponent(matchId)}&orderBy=createdAt&order=desc&limit=100`
  const res = await fetch(`${BASE}/messages?${qs}`, {
    headers: await authHeaders(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const items: ChatMsg[] = Array.isArray(data?.items) ? data.items : []
  return items.slice().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
}

export async function sendThreadMessage(matchId: string, text: string): Promise<void> {
  // The backend's generic write path keys every row by an explicit `id` (it
  // never generates one) — verified directly against the live API: a POST
  // without `id` 400s with "Missing id". senderId/createdAt are stamped
  // server-side from the caller's token. senderName is stored verbatim and the
  // app aligns bubbles by it — omitting it makes web-sent messages render on
  // the wrong side in the app.
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const user = currentUser()
  const senderName = user?.displayName || user?.email?.split('@')[0] || ''
  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ id, matchId, text, senderName }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error('שליחת ההודעה נכשלה. נסו שוב.')
}

// ── Tenant interest (like) ───────────────────────────────────────────────────
// The app's swipe-like writes a row to /property_likes — that row IS the lead
// the landlord sees (app deck + website MessagesTab both rank from it). The
// website had no way to create one, so a web tenant could never generate a
// lead or a match. Mirrors PropertyLikesRepository.buildAddLikeBody exactly:
// same id scheme (like_<propertyId>_<tenantId>, unsafe chars → _), same
// required keys, optional keys only when present.

function safeLikePart(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, '_')
}

export function likeIdFor(propertyId: string, tenantId: string): string {
  return `like_${safeLikePart(propertyId)}_${safeLikePart(tenantId)}`
}

export async function sendInterest(
  propertyId: string,
  ownerUserId: string,
  introMessage = '',
): Promise<void> {
  const user = currentUser()
  if (!user) throw new Error('נדרשת התחברות כדי לשלוח פנייה.')
  const note = introMessage.trim().slice(0, 140)
  const res = await fetch(`${BASE}/property_likes`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      id: likeIdFor(propertyId, user.uid),
      propertyId,
      ownerUserId,
      tenantId: user.uid,
      tenantName: user.displayName || user.email?.split('@')[0] || '',
      tenantPhotoUrl: user.photoURL || '',
      ...(note ? { introMessage: note } : {}),
      createdAt: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error('שליחת הפנייה נכשלה. נסו שוב.')
}

// ── Dismissed leads — kept local for an instant optimistic hide (no round
// trip needed to make the card disappear), PLUS synced server-side via
// POST /match/reject so the rejection is honored on every device and the
// app, not just this browser. The app's own left-swipe used to be local-only
// too (never called the server) — fixed the same way on that side.
const DISMISS_KEY = 'rently-dismissed-leads'

// Account-scoped — otherwise landlord B on a shared browser would inherit
// landlord A's dismissed-leads list before the server round trip lands.
function dismissKey(): string {
  const uid = currentUser()?.uid
  return uid ? `${DISMISS_KEY}-${uid}` : `${DISMISS_KEY}-guest`
}

function dismissedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(dismissKey())
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
  if (typeof window !== 'undefined') {
    const set = dismissedSet()
    set.add(matchIdFor(propertyId, tenantId))
    window.localStorage.setItem(dismissKey(), JSON.stringify([...set]))
  }
  void (async () => {
    try {
      await fetch(`${BASE}/match/reject`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ propertyId, tenantId }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
    } catch {
      /* fail-soft — the local hide already happened */
    }
  })()
}
