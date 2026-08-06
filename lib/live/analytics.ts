'use client'

// Analytics data layer for the publisher area (docs/research/SPEC_PUBLISHER_AREA.md §4).
//
// Everything here obeys the spec's principles §0:
//   · "לא ממציאים נתון" — a number with no real source is `null`, never 0 and never
//     a plausible-looking guess. A failed request and "zero views" are different facts.
//   · "מספר בלי השוואה אינו מידע" — every health verdict carries the number it came from.
//   · "אין אחוזים על מדגם קטן" — see MIN_RATE_DENOM / formatRate.
//   · "פילוח קהל מצרפי בלבד, עם סף k≥5" — see K_ANON / buildAudience, and the hard
//     refusal to segment on protected attributes (PROTECTED_DIMENSIONS).
//
// Every network call is independently fail-soft: one dead endpoint blanks one field,
// not the card.

import type { Property } from './types'
import type { PriceBadgeData } from './enrichment'

// Same-origin rewrite (next.config.ts) proxies to the prod API — no CORS.
const BASE = '/api/rently'

// ─────────────────────────────────────────────────────────────────────────────
// Contract (spec §4)
// ─────────────────────────────────────────────────────────────────────────────

/** Threshold below which an aggregate segment is not exposed at all. */
export const K_ANON = 5

/** Below this denominator we show a raw count, never a percentage or a ratio. */
export const MIN_RATE_DENOM = 30

/** Peer group smaller than this ⇒ no regional comparison is drawn (spec §4 comment). */
export const MIN_BENCHMARK_SAMPLE = 5

export interface Benchmark {
  medianViews: number | null
  medianDaysOnMarket: number | null
  /** Number of peer listings the medians were computed over. `< MIN_BENCHMARK_SAMPLE` ⇒ do not display. */
  sampleSize: number
}

export type HealthState = 'healthy' | 'watch' | 'needs_action'

export interface ListingHealth {
  property: Property
  views: number | null // null = not loaded (NOT "zero views")
  saves: number | null
  inquiries: number | null
  daysOnMarket: number | null
  priceBadge: PriceBadgeData | null
  benchmark: Benchmark
  state: HealthState
  /** Hebrew, display-ready. Each string names the number it was derived from. */
  reasons: string[]
}

export interface AudienceSegment {
  key: string
  label: string
  count: number
}

export interface AudienceBreakdown {
  total: number
  suppressed: boolean // true when total < K_ANON
  segments: AudienceSegment[]
  declaredTargets: string[]
  matchQuality: 'aligned' | 'partial' | 'mismatch' | 'unknown'
}

/**
 * Fields that live rows carry but `lib/live/types.ts` does not declare (that file is
 * owned elsewhere). Declared locally so this module stays strictly typed.
 */
export type OwnerProperty = Property & {
  ownerUserId?: string
  createdAt?: string | number | null
  /** Cohort the publisher declared at publish time — shape varies by client version. */
  targetAudience?: unknown
  targetTenants?: unknown
  cohorts?: unknown
  audienceTargets?: unknown
}

/** A row from `GET /property_likes?propertyId=` — may carry a tenant snapshot. */
export type LikeRow = Record<string, unknown>

export interface OwnerPropertiesResult {
  items: OwnerProperty[]
  /**
   * false ⇒ the request failed. `items: []` with `ok: false` means "we don't know",
   * NOT "this publisher has no listings" — the UI must say so rather than show
   * an empty state.
   */
  ok: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Small guards / parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function coerceList<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[]
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Auth header, resolved lazily. The dynamic import keeps `./firebase` (and its
 * browser-only SDK) off this module's import graph, so the pure scoring functions
 * can be imported and tested without a browser. If auth is unavailable the request
 * still goes out unauthenticated and simply fails soft.
 */
async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { getToken } = await import('./firebase')
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', ...(await authHeaders()) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** `/count` endpoints have shipped as `{count}`, `{data:{count}}`, `{total}` and a bare number. */
function pickCount(payload: unknown): number | null {
  const direct = num(payload)
  if (direct !== null) return direct >= 0 ? Math.round(direct) : null
  const map = asRecord(payload)
  if (!map) return null
  for (const key of ['count', 'total', 'value']) {
    const n = num(map[key])
    if (n !== null && n >= 0) return Math.round(n)
  }
  const nested = asRecord(map.data)
  if (nested) {
    for (const key of ['count', 'total', 'value']) {
      const n = num(nested[key])
      if (n !== null && n >= 0) return Math.round(n)
    }
  }
  if (Array.isArray(map.items)) return map.items.length
  return null
}

function pickList(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload
  const map = asRecord(payload)
  if (!map) return null
  for (const key of ['items', 'matches', 'likes', 'results']) {
    if (Array.isArray(map[key])) return map[key] as unknown[]
  }
  const nested = asRecord(map.data)
  if (nested) {
    for (const key of ['items', 'matches', 'likes', 'results']) {
      if (Array.isArray(nested[key])) return nested[key] as unknown[]
    }
  }
  if (Array.isArray(map.data)) return map.data as unknown[]
  return null
}

/** ISO (136/136 live rows), "YYYY-MM-DD HH:MM:SS", or epoch seconds/millis. */
export function parseCreatedAt(v: unknown): Date | null {
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null
  const n = typeof v === 'number' ? v : null
  if (n !== null) {
    if (!Number.isFinite(n) || n <= 0) return null
    const ms = n < 1e12 ? n * 1000 : n // seconds vs millis
    const d = new Date(ms)
    return Number.isFinite(d.getTime()) ? d : null
  }
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  const epoch = /^\d+$/.test(s) ? Number(s) : null
  if (epoch !== null) return parseCreatedAt(epoch)
  const t = Date.parse(s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s)
  return Number.isFinite(t) ? new Date(t) : null
}

/** Whole days since `createdAt`. null when the row carries nothing parsable. */
export function daysOnMarket(property: OwnerProperty, now: Date = new Date()): number | null {
  const created = parseCreatedAt(property.createdAt)
  if (!created) return null
  const days = Math.floor((now.getTime() - created.getTime()) / 86_400_000)
  if (!Number.isFinite(days)) return null
  return days < 0 ? 0 : days // a clock-skewed future date is "brand new", not negative
}

function median(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  const m = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return Number.isFinite(m) ? m : null
}

/** 'תל אביב' vs 'תל אביב יפו' is the same city; 'גן יבנה' vs 'יבנה' is not. */
function normCity(v: unknown): string {
  return String(v ?? '')
    .replace(/[־-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*יפו$/, '')
}

function sameCity(a: unknown, b: unknown): boolean {
  const x = normCity(a)
  const y = normCity(b)
  return x !== '' && y !== '' && x === y
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Owner properties
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `GET /properties?ownerUserId=<uid>` — owner-scoped and IDOR-gated server side (spec §2).
 * Drops `status === 'removed'`, which is what the app treats as deleted; inactive /
 * rented listings are kept because the publisher still wants their history.
 */
export async function fetchOwnerProperties(uid: string): Promise<OwnerPropertiesResult> {
  if (!uid) return { items: [], ok: false }
  try {
    const data = await getJson(
      `/properties?ownerUserId=${encodeURIComponent(uid)}&order=desc&limit=200`,
    )
    const list = pickList(data) ?? []
    const items = (list as OwnerProperty[])
      .filter((p) => p && typeof p === 'object' && !!p.id)
      .filter((p) => String(p.status ?? '').toLowerCase() !== 'removed')
      // Some DB rows store media/imageUrls/smartTags as JSON-encoded strings.
      .map((p) => ({
        ...p,
        media: coerceList<{ url: string; type?: string }>(p.media),
        imageUrls: coerceList<string>(p.imageUrls),
        smartTags: coerceList<string>(p.smartTags),
      }))
    return { items, ok: true }
  } catch (e) {
    console.warn('[analytics] owner properties failed (fail-soft):', (e as Error).message)
    return { items: [], ok: false }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Per-listing counters
// ─────────────────────────────────────────────────────────────────────────────

// The denormalised viewCount / likeCount fields on the property row are structurally
// broken (spec §1): a repeat view overwrites the view row but still increments the
// counter, so they inflate without bound. Only the /count endpoints are truthful.

export async function fetchViewCount(propertyId: string): Promise<number | null> {
  try {
    return pickCount(await getJson(`/property_views/count?propertyId=${encodeURIComponent(propertyId)}`))
  } catch (e) {
    console.warn('[analytics] view count unavailable:', (e as Error).message)
    return null
  }
}

export async function fetchSaveCount(propertyId: string): Promise<number | null> {
  try {
    return pickCount(await getJson(`/property_likes/count?propertyId=${encodeURIComponent(propertyId)}`))
  } catch (e) {
    console.warn('[analytics] save count unavailable:', (e as Error).message)
    return null
  }
}

/** `GET /property_likes?propertyId=` — the rows behind buildAudience(). */
export async function fetchPropertyLikes(propertyId: string): Promise<LikeRow[] | null> {
  try {
    const list = pickList(await getJson(`/property_likes?propertyId=${encodeURIComponent(propertyId)}`))
    return list ? (list.filter((r) => !!asRecord(r)) as LikeRow[]) : null
  } catch (e) {
    console.warn('[analytics] property likes unavailable:', (e as Error).message)
    return null
  }
}

// /matches is owner-scoped, not property-scoped, so building health for N listings
// would otherwise issue N identical requests. Memoised per uid for 60s (same pattern
// as api.ts's listings memo). null result = failed, and stays null — never 0.
let matchesMemo: { uid: string; res: Promise<Record<string, unknown>[] | null>; ts: number } | null = null

export async function fetchOwnerMatches(uid: string): Promise<Record<string, unknown>[] | null> {
  if (!uid) return null
  if (matchesMemo && matchesMemo.uid === uid && Date.now() - matchesMemo.ts < 60_000) return matchesMemo.res
  const res = (async () => {
    try {
      const list = pickList(await getJson(`/matches?landlordUid=${encodeURIComponent(uid)}`))
      return list ? (list.map(asRecord).filter(Boolean) as Record<string, unknown>[]) : null
    } catch (e) {
      console.warn('[analytics] matches unavailable:', (e as Error).message)
      matchesMemo = null // don't cache a failure
      return null
    }
  })()
  matchesMemo = { uid, res, ts: Date.now() }
  return res
}

export function countInquiries(matches: Record<string, unknown>[] | null, propertyId: string): number | null {
  if (!matches) return null // a failed fetch is not "no inquiries"
  return matches.filter((m) => String(m.propertyId ?? m.property_id ?? '') === propertyId).length
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Regional benchmark — computed LOCALLY over the catalogue (spec §2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Peers = same city AND rooms within ±0.5.
 *
 * `medianViews` is deliberately left null unless the caller supplies per-peer view
 * counts: there is no bulk views endpoint, so a real median would mean one
 * `/property_views/count` request per peer listing — dozens to hundreds of requests
 * per card, against a HASH-only GSI (spec §2 "מגבלת ביצועים ידועה"). We do not invent
 * it, and we do not fetch it.
 */
export function computeBenchmark(
  property: OwnerProperty,
  catalogue: OwnerProperty[],
  opts: { now?: Date; peerViews?: Map<string, number> | Record<string, number> } = {},
): Benchmark {
  const now = opts.now ?? new Date()
  const rooms = num(property.rooms)
  const peers = (Array.isArray(catalogue) ? catalogue : []).filter((p) => {
    if (!p || p.id === property.id) return false
    if (!sameCity(p.city, property.city)) return false
    const r = num(p.rooms)
    if (rooms === null || r === null) return false
    return Math.abs(r - rooms) <= 0.5
  })

  const peerDays = peers
    .map((p) => daysOnMarket(p, now))
    .filter((d): d is number => d !== null)

  let medianViews: number | null = null
  const supplied = opts.peerViews
  if (supplied) {
    const get = (id: string): number | null =>
      supplied instanceof Map ? num(supplied.get(id)) : num(supplied[id])
    const vals = peers.map((p) => get(p.id)).filter((v): v is number => v !== null)
    medianViews = vals.length ? median(vals) : null
  }

  return {
    medianViews: medianViews === null ? null : Math.round(medianViews),
    medianDaysOnMarket: peerDays.length ? Math.round(median(peerDays) ?? 0) : null,
    sampleSize: peers.length,
  }
}

/** A median is only usable as a comparison when the peer group is big enough. */
function usableMedianDays(b: Benchmark): number | null {
  if (b.sampleSize < MIN_BENCHMARK_SAMPLE) return null
  return b.medianDaysOnMarket !== null && Number.isFinite(b.medianDaysOnMarket) ? b.medianDaysOnMarket : null
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. The state machine
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY: Record<HealthState, number> = { healthy: 0, watch: 1, needs_action: 2 }

function badgeOf(priceBadge: PriceBadgeData | null): string {
  return String(priceBadge?.badge ?? '').toLowerCase()
}

/**
 * Derives `state` + Hebrew `reasons` from real measurements only. Every rule that
 * fires names the number that fired it — a verdict the publisher cannot trace back
 * to a number is not actionable (spec §0.2, §0.5).
 *
 * Rules (each independent; the worst state wins, all reasons are kept):
 *  1. views === 0 and 7+ days on market                       ⇒ needs_action
 *  2. daysOnMarket > 1.5× peer median (sampleSize ≥ 5)        ⇒ needs_action
 *  3. saves > 0, inquiries === 0, views ≥ 20                  ⇒ watch (interest, no contact)
 *  4. priceBadge 'above_market' and daysOnMarket > peer median ⇒ needs_action
 *  5. otherwise                                                ⇒ healthy
 */
export function deriveHealthState(input: {
  views: number | null
  saves: number | null
  inquiries: number | null
  daysOnMarket: number | null
  priceBadge: PriceBadgeData | null
  benchmark: Benchmark
}): { state: HealthState; reasons: string[] } {
  const { views, saves, inquiries, daysOnMarket: dom, priceBadge, benchmark } = input
  const reasons: string[] = []
  let state: HealthState = 'healthy'
  const raise = (s: HealthState, reason: string) => {
    if (SEVERITY[s] > SEVERITY[state]) state = s
    reasons.push(reason)
  }

  const peerMedian = usableMedianDays(benchmark)

  // 1 — published, and nobody has opened it.
  if (views === 0 && dom !== null && dom >= 7) {
    raise('needs_action', `הדירה מפורסמת ${dom} ימים ועדיין אין אף צפייה — כדאי לרענן תמונות, כותרת או מחיר`)
  }

  // 2 — sitting far longer than comparable listings.
  if (dON(dom) && peerMedian !== null && peerMedian > 0 && (dom as number) > peerMedian * 1.5) {
    raise(
      'needs_action',
      `${dom} ימים בשוק, לעומת חציון של ${peerMedian} ימים ב-${benchmark.sampleSize} דירות דומות בעיר`,
    )
  }

  // 3 — interest without contact: they saved it and never reached out.
  if ((saves ?? 0) > 0 && inquiries === 0 && views !== null && views >= 20) {
    raise(
      'watch',
      `${saves} שמירות ו-${views} צפיות, אבל 0 פניות — יש עניין שלא מתורגם ליצירת קשר`,
    )
  }

  // 4 — priced above the area AND slower than the area.
  if (badgeOf(priceBadge) === 'above_market' && dON(dom) && peerMedian !== null && (dom as number) > peerMedian) {
    const delta = num(priceBadge?.deltaPct)
    const priced = delta !== null ? `המחיר גבוה ב-${Math.abs(Math.round(delta))}% מחציון האזור` : 'המחיר מעל חציון האזור'
    raise(
      'needs_action',
      `${priced}, והדירה כבר ${dom} ימים בשוק מול חציון של ${peerMedian} ימים`,
    )
  }

  if (!reasons.length) {
    if (views === null && saves === null && inquiries === null) {
      // Nothing loaded — say that, rather than let silence read as a clean bill of health.
      reasons.push('לא נטענו נתוני צפיות, שמירות ופניות — אין ממצא לדווח עליו')
    } else {
      const parts: string[] = []
      if (views !== null) parts.push(`${views} צפיות`)
      if (saves !== null) parts.push(`${saves} שמירות`)
      if (inquiries !== null) parts.push(`${inquiries} פניות`)
      if (dom !== null) parts.push(`${dom} ימים בשוק`)
      reasons.push(parts.length ? `${parts.join(', ')} — אין כרגע ממצא שדורש טיפול` : 'אין כרגע ממצא שדורש טיפול')
    }
  }

  return { state, reasons }
}

/** days-on-market is present (a plain guard, kept out of the rule lines for readability). */
function dON(d: number | null): boolean {
  return d !== null && Number.isFinite(d)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. fetchListingHealth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds one ListingHealth. Fans out with Promise.allSettled so a single dead
 * endpoint nulls exactly one field.
 *
 * `catalogue` is the full active listing list (from api.ts's fetchProperties) — the
 * benchmark is computed locally over it, no extra request.
 */
export async function fetchListingHealth(
  property: OwnerProperty,
  catalogue: OwnerProperty[] = [],
  opts: {
    now?: Date
    /** Falls back to `property.ownerUserId`; needed for the /matches lookup. */
    ownerUid?: string
    /** Pre-fetched matches, so a portfolio view fetches them once for all listings. */
    matches?: Record<string, unknown>[] | null
    peerViews?: Map<string, number> | Record<string, number>
  } = {},
): Promise<ListingHealth> {
  const now = opts.now ?? new Date()
  const id = property?.id ?? ''
  const uid = opts.ownerUid ?? property?.ownerUserId ?? ''

  const [viewsR, savesR, matchesR, enrichR] = await Promise.allSettled([
    id ? fetchViewCount(id) : Promise.resolve(null),
    id ? fetchSaveCount(id) : Promise.resolve(null),
    opts.matches !== undefined ? Promise.resolve(opts.matches) : fetchOwnerMatches(uid),
    (async () => {
      try {
        if (!id) return null
        const { fetchListingEnrichment } = await import('./enrichment')
        const enrichment = await fetchListingEnrichment(id)
        const badge = asRecord(enrichment?.priceBadge)
        return badge ? (badge as PriceBadgeData) : null
      } catch {
        return null
      }
    })(),
  ])

  const settled = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === 'fulfilled' ? r.value : fallback

  const views = settled(viewsR, null)
  const saves = settled(savesR, null)
  const matches = settled(matchesR, null)
  const priceBadge = settled(enrichR, null)

  const benchmark = computeBenchmark(property, catalogue, { now, peerViews: opts.peerViews })
  const dom = daysOnMarket(property, now)
  const inquiries = countInquiries(matches, id)

  const { state, reasons } = deriveHealthState({
    views,
    saves,
    inquiries,
    daysOnMarket: dom,
    priceBadge,
    benchmark,
  })

  return { property, views, saves, inquiries, daysOnMarket: dom, priceBadge, benchmark, state, reasons }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Aggregate audience — k-anonymous, non-protected dimensions only
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attributes we refuse to segment on. The server deliberately removed hard filtering
 * on these as a housing-discrimination exposure (spec §1) and we follow its posture:
 * these keys are never read, never counted, never labelled.
 */
export const PROTECTED_DIMENSIONS: readonly string[] = [
  'religiousLifestyle', 'religious', 'religion', 'shabbatObservant', 'keepsKosher',
  'sector', 'ethnicity', 'origin', 'countryOfOrigin', 'isOleh', 'oleh',
  'age', 'birthYear', 'dateOfBirth',
  'monthlyIncome', 'income', 'salary',
  'nationality', 'race', 'gender', 'maritalStatus',
]

const OTHER_LABEL = 'אחר'

const HOUSEHOLD_LABELS: Record<string, string> = {
  single: 'יחיד/ה',
  couple: 'זוג',
  family: 'משפחה',
  roommates: 'שותפים',
  single_parent: 'הורה יחיד/ה',
}

const LIFE_STAGE_LABELS: Record<string, string> = {
  student: 'סטודנט/ית',
  young_professional: 'תחילת קריירה',
  young_couple: 'זוג צעיר',
  family: 'משפחה עם ילדים',
  established: 'משפחה מבוססת',
  empty_nest: 'קן ריק',
  retiree: 'גמלאי/ת',
}

const BUDGET_BANDS: { key: string; below: number; label: string }[] = [
  { key: 'lt4000', below: 4000, label: 'תקציב עד ₪4,000' },
  { key: '4000_6000', below: 6000, label: 'תקציב ₪4,000–₪6,000' },
  { key: '6000_8000', below: 8000, label: 'תקציב ₪6,000–₪8,000' },
  { key: '8000_10000', below: 10000, label: 'תקציב ₪8,000–₪10,000' },
  { key: '10000_15000', below: 15000, label: 'תקציב ₪10,000–₪15,000' },
  { key: 'gt15000', below: Infinity, label: 'תקציב מעל ₪15,000' },
]

/** The like row may nest the tenant snapshot, or carry the fields flat. */
function snapshotOf(row: LikeRow): Record<string, unknown> {
  const base = asRecord(row) ?? {}
  const nested =
    asRecord(base.tenant) ??
    asRecord(base.tenantProfile) ??
    asRecord(base.tenantSnapshot) ??
    asRecord(base.snapshot) ??
    asRecord(base.profile)
  return nested ? { ...base, ...nested } : base
}

function boolOf(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'true' || s === 'yes' || s === 'כן') return true
    if (s === 'false' || s === 'no' || s === 'לא') return false
  }
  return null
}

function strOf(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

/**
 * Non-protected, decision-useful dimensions only: household type, life stage,
 * has-car, works-from-home, number-of-children band and search-budget band.
 * Anything in PROTECTED_DIMENSIONS is never touched here.
 */
function segmentsFor(snap: Record<string, unknown>): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []

  const household = strOf(snap.household ?? snap.householdType)
  if (household) {
    const k = household.toLowerCase()
    out.push({ key: `household:${k}`, label: HOUSEHOLD_LABELS[k] ?? household })
  }

  const lifeStage = strOf(snap.lifeStage ?? snap.life_stage)
  if (lifeStage) {
    const k = lifeStage.toLowerCase()
    out.push({ key: `lifeStage:${k}`, label: LIFE_STAGE_LABELS[k] ?? lifeStage })
  }

  const car = boolOf(snap.hasCar)
  if (car !== null) out.push({ key: `car:${car ? 'yes' : 'no'}`, label: car ? 'עם רכב' : 'בלי רכב' })

  const wfh = boolOf(snap.wfh ?? snap.worksFromHome)
  if (wfh !== null) out.push({ key: `wfh:${wfh ? 'yes' : 'no'}`, label: wfh ? 'עובד/ת מהבית' : 'לא עובד/ת מהבית' })

  const children = num(snap.numChildren ?? snap.children)
  if (children !== null && children >= 0) {
    if (children === 0) out.push({ key: 'children:0', label: 'בלי ילדים' })
    else if (children <= 2) out.push({ key: 'children:1_2', label: '1–2 ילדים' })
    else out.push({ key: 'children:3plus', label: '3 ילדים ומעלה' })
  }

  const budget = num(snap.budgetMax ?? snap.budget ?? snap.searchBudgetMax)
  if (budget !== null && budget > 0) {
    const band = BUDGET_BANDS.find((b) => budget < b.below) ?? BUDGET_BANDS[BUDGET_BANDS.length - 1]
    out.push({ key: `budget:${band.key}`, label: band.label })
  }

  return out
}

function normToken(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .replace(/[׳״'"־–—,.()/\\]/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function targetMatchesSegment(target: string, segment: AudienceSegment): boolean {
  const t = normToken(target)
  if (t.length < 2) return false
  const value = segment.key.includes(':') ? segment.key.split(':').slice(1).join(':') : segment.key
  const tokens = [segment.key, value, segment.label].map(normToken).filter((x) => x.length >= 2)
  return tokens.some((tok) => tok === t || tok.includes(t) || t.includes(tok))
}

/**
 * Aggregate-only audience breakdown with a hard k≥5 floor (spec §0.6).
 *
 * · `total < K_ANON`            ⇒ suppressed, zero segments returned.
 * · any segment `count < K_ANON` ⇒ folded into an "אחר" bucket for its dimension,
 *   and that bucket is itself dropped if it still doesn't reach K_ANON (a residual
 *   of one person is as identifying as the segment we just hid).
 * · rows that simply don't declare a dimension are excluded from it — "unknown" is
 *   not a finding.
 */
export function buildAudience(likeRows: LikeRow[] | null | undefined, declaredTargets: unknown = []): AudienceBreakdown {
  const rows = Array.isArray(likeRows) ? likeRows.filter((r) => !!asRecord(r)) : []
  const targets = coerceList<unknown>(declaredTargets)
    .map((t) => (typeof t === 'string' ? t.trim() : strOf(asRecord(t)?.label ?? asRecord(t)?.key)))
    .filter((t): t is string => !!t)

  const total = rows.length

  if (total < K_ANON) {
    return { total, suppressed: true, segments: [], declaredTargets: targets, matchQuality: 'unknown' }
  }

  // dimension → key → { label, count }
  const byDimension = new Map<string, Map<string, { label: string; count: number }>>()
  for (const row of rows) {
    for (const seg of segmentsFor(snapshotOf(row))) {
      const dim = seg.key.split(':')[0]
      const bucket = byDimension.get(dim) ?? new Map<string, { label: string; count: number }>()
      const cur = bucket.get(seg.key) ?? { label: seg.label, count: 0 }
      cur.count += 1
      bucket.set(seg.key, cur)
      byDimension.set(dim, bucket)
    }
  }

  const segments: AudienceSegment[] = []
  for (const [dim, bucket] of byDimension) {
    let otherCount = 0
    for (const [key, { label, count }] of bucket) {
      if (count >= K_ANON) segments.push({ key, label, count })
      else otherCount += count
    }
    if (otherCount >= K_ANON) segments.push({ key: `${dim}:other`, label: OTHER_LABEL, count: otherCount })
  }
  segments.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))

  return {
    total,
    suppressed: false,
    segments,
    declaredTargets: targets,
    matchQuality: assessMatch(segments, targets),
  }
}

/**
 * Closes the loop between the cohort declared at publish time and the cohort that
 * actually showed up. 'unknown' whenever we can't honestly compare.
 */
function assessMatch(segments: AudienceSegment[], targets: string[]): AudienceBreakdown['matchQuality'] {
  if (!targets.length || !segments.length) return 'unknown'
  const real = segments.filter((s) => s.label !== OTHER_LABEL)
  if (!real.length) return 'unknown'

  // Compare against each DIMENSION'S LEADER, not a flat top-N across every
  // dimension — a field nearly everyone shares (e.g. budget band, has-car)
  // would otherwise dominate a flat top-3 by sheer count and bury the
  // dimension the landlord's declared target actually lives in.
  const leaders = new Map<string, AudienceSegment>()
  for (const s of real) {
    const dim = s.key.split(':')[0]
    const cur = leaders.get(dim)
    if (!cur || s.count > cur.count) leaders.set(dim, s)
  }
  const leaderList = [...leaders.values()]

  const inLead = targets.filter((t) => leaderList.some((s) => targetMatchesSegment(t, s)))
  if (inLead.length === targets.length) return 'aligned'
  const anywhere = targets.filter((t) => real.some((s) => targetMatchesSegment(t, s)))
  return anywhere.length ? 'partial' : 'mismatch'
}

/** Reads the cohort the publisher declared, whichever field the client version wrote. */
export function declaredTargetsOf(property: OwnerProperty): string[] {
  const raw = property?.targetAudience ?? property?.targetTenants ?? property?.cohorts ?? property?.audienceTargets
  return coerceList<unknown>(raw)
    .map((t) => (typeof t === 'string' ? t.trim() : strOf(asRecord(t)?.label ?? asRecord(t)?.key)))
    .filter((t): t is string => !!t)
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Rate formatting — no percentages on a small sample (spec §0.3)
// ─────────────────────────────────────────────────────────────────────────────

export interface RateText {
  text: string
  /** false ⇒ this is a raw count, not a rate. The UI must not append a '%'. */
  isRate: boolean
}

/**
 * Below MIN_RATE_DENOM we state the raw counts ("3 פניות מ־12 צפיות"); above it we
 * state a hard-rounded ratio ("בערך 1 מכל 4"). Never a decimal: "8.3%" on 12 views
 * is false precision.
 */
export function formatRate(
  numerator: unknown,
  denominator: unknown,
  labels: { numerator?: string; denominator?: string } = {},
): RateText {
  const nLabel = labels.numerator ?? 'פניות'
  const dLabel = labels.denominator ?? 'צפיות'
  const n = num(numerator)
  const d = num(denominator)
  if (n === null || d === null || n < 0 || d <= 0) return { text: 'אין מספיק נתונים', isRate: false }

  const rawText = `${Math.round(n)} ${nLabel} מ־${Math.round(d)} ${dLabel}`
  if (d < MIN_RATE_DENOM) return { text: rawText, isRate: false }
  // A ratio needs something to divide by, and "1 מכל 1" is not information.
  if (n <= 0 || n >= d) return { text: rawText, isRate: false }
  const oneIn = Math.round(d / n)
  if (oneIn < 2) return { text: rawText, isRate: false }
  return { text: `בערך 1 מכל ${oneIn}`, isRate: true }
}
