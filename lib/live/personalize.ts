'use client'

// ═════════════════════════════════════════════════════════════════════════════
// PERSONALIZE — TypeScript port of the app's "מותאם אישית" (personalization)
// half of אתי. The fast/immediate half already lives in ./smart-search.
//
// Dart source of truth (flutter-ranting-tinder-project):
//   • lib/presentation/features/search/search_chat_screen.dart
//       _immediateMode / _interviewAsked / _nextInterviewQuestion / _send /
//       _upgradeSearch / _cohortSignals / _cohortRanked / _verifyResults /
//       _applyLifestyleFilter / _rankByLifestyle / _serverReply / _localReply /
//       _warmFallback / _cohortFollowup / _fetchExplanations / _ettiEnrich /
//       _merge / _prefsOnly / _cityKey / _nearbySameFilters / _lifestyleNote
//   • lib/presentation/widgets/speed_mode_slider.dart  (SpeedMode, pref key)
//   • lib/data/repositories/property_search_repository.dart  search()
//
// Same Hebrew strings, same question bank, same order of operations, same
// constants. Every network step is fail-soft: a failure NEVER blanks results
// that are already on screen.
// ═════════════════════════════════════════════════════════════════════════════

import { getToken } from './firebase'
import { haversineKm } from './nearby'
import {
  SearchIntent,
  cohortSignals as baseCohortSignals,
  describeQuery,
  detectReligiosity,
  parseQuery,
  propertyHasFeature,
  queryIsEmpty,
  rankByLifestyle,
  rankProperties,
  type ParsedQuery,
  type ScoredWebProperty,
} from './smart-search'
import type { ChatTurn, Property } from './types'

const BASE = '/api/rently'

// ─────────────────────────────────────────────────────────────────────────────
// Speed mode — port of SpeedMode (speed_mode_slider.dart)
// ─────────────────────────────────────────────────────────────────────────────

/** SharedPreferences key the app uses — kept identical for parity. */
export const SPEED_MODE_KEY = 'etti_immediate_mode'

/**
 * `immediate === true`  → מהיר: purely on-device, nothing waits on the network.
 * `immediate === false` → מותאם אישית: guided interview + the background
 *   personalisation upgrade (enrich → cohort → verify → warm reply → explain).
 *
 * DEFAULT is `false` — the Dart's `SpeedMode.immediate = ValueNotifier(false)`
 * and `_immediateMode = false`, i.e. the app opens in מותאם אישית.
 */
export const DEFAULT_IMMEDIATE = false

export function loadImmediateMode(): boolean {
  if (typeof window === 'undefined') return DEFAULT_IMMEDIATE
  try {
    const raw = window.localStorage.getItem(SPEED_MODE_KEY)
    if (raw === null) return DEFAULT_IMMEDIATE
    return raw === 'true'
  } catch {
    return DEFAULT_IMMEDIATE
  }
}

export function saveImmediateMode(v: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SPEED_MODE_KEY, String(v))
  } catch {
    // private mode / quota — the session still works in memory.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Query accumulation — ports of _merge / _prefsOnly / _cityKey and the city-
// switch rule inside _send. The web has no persistent SearchQuery object, so the
// conversation's query is recomputed from its user turns (same fold, same rules).
// ─────────────────────────────────────────────────────────────────────────────

export function emptyQuery(): ParsedQuery {
  return parseQuery('')
}

/** Port of _merge (search_chat_screen.dart:1778). `b` (the newer turn) wins. */
export function mergeQueries(a: ParsedQuery, b: ParsedQuery): ParsedQuery {
  return {
    city: b.city ?? a.city,
    neighborhood: b.neighborhood ?? a.neighborhood,
    excludeAreas: [...new Set([...a.excludeAreas, ...b.excludeAreas])],
    areaDir: b.areaDir ?? a.areaDir,
    areaDirExclude: b.areaDir !== null ? b.areaDirExclude : a.areaDirExclude,
    minPrice: b.minPrice ?? a.minPrice,
    maxPrice: b.maxPrice ?? a.maxPrice,
    minRooms: b.minRooms ?? a.minRooms,
    maxRooms: b.maxRooms ?? a.maxRooms,
    propertyType: b.propertyType ?? a.propertyType,
    amenities: new Set([...a.amenities, ...b.amenities]),
    nearTrain: a.nearTrain || b.nearTrain,
    cheapPreference: a.cheapPreference || b.cheapPreference,
    transactionType: b.transactionType !== 'any' ? b.transactionType : a.transactionType,
    rawText: `${a.rawText} ${b.rawText}`.trim(),
    intents: new Set([...a.intents, ...b.intents]),
    requiredFeatures: new Set([...a.requiredFeatures, ...b.requiredFeatures]),
  }
}

/** Port of _cityKey — "תל אביב" and "תל אביב - יפו" are the SAME city. */
export function cityKey(c: string): string {
  return c.split('-')[0].split('(')[0].trim()
}

/** Port of _prefsOnly — everything EXCEPT the place + accumulated rawText. */
export function prefsOnly(q: ParsedQuery): ParsedQuery {
  return {
    ...emptyQuery(),
    minPrice: q.minPrice,
    maxPrice: q.maxPrice,
    minRooms: q.minRooms,
    maxRooms: q.maxRooms,
    propertyType: q.propertyType,
    amenities: new Set(q.amenities),
    nearTrain: q.nearTrain,
    cheapPreference: q.cheapPreference,
    transactionType: q.transactionType,
    intents: new Set(q.intents),
    requiredFeatures: new Set(q.requiredFeatures),
    // city / neighborhood / excludeAreas / areaDir / rawText intentionally dropped
  }
}

/**
 * Folds every user turn into one accumulated query, applying the app's mid-
 * conversation CITY SWITCH rule: a turn naming a DIFFERENT city drops the old
 * location context (city / hood / exclusions / rawText) but keeps preferences.
 */
export function conversationQuery(userTexts: string[]): ParsedQuery {
  let q = emptyQuery()
  for (const t of userTexts) {
    const parsed = parseQuery(t)
    if (parsed.city !== null && q.city !== null && cityKey(parsed.city) !== cityKey(q.city)) {
      q = mergeQueries(prefsOnly(q), parsed)
    } else {
      q = mergeQueries(q, parsed)
    }
  }
  return q
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifestyle layer — ports of _applyLifestyle / _needsElevator /
// _applyLifestyleFilter / _lifestyleNote
// ─────────────────────────────────────────────────────────────────────────────

export type Religiosity = NonNullable<ReturnType<typeof detectReligiosity>>

export interface Persona {
  religiosity: Religiosity | null
  baby: boolean
}

const BABY_RE = /תינוק|תינוקת|עגל[הת]|פעוט|רך\s*נולד|עולל/

/** Port of _applyLifestyle's detection half, over the whole conversation. */
export function personaFrom(conversationText: string): Persona {
  return {
    religiosity: detectReligiosity(conversationText),
    baby: BABY_RE.test(conversationText),
  }
}

/** Port of _needsElevator — Shabbat-observant or a stroller both need a lift. */
export function needsElevator(p: Persona): boolean {
  return p.baby || p.religiosity === 'religious' || p.religiosity === 'haredi'
}

/** Port of _applyLifestyle's mutation half — folds feat_elevator into the query. */
export function applyLifestyle(q: ParsedQuery, p: Persona): ParsedQuery {
  if (!needsElevator(p)) return q
  return { ...q, amenities: new Set([...q.amenities, 'feat_elevator']) }
}

function floorNumber(p: Property): number | null {
  const raw = (p.floor ?? '').toString().trim()
  if (!raw) return null
  const m = /-?\d+/.exec(raw)
  return m ? parseInt(m[0], 10) : null
}

/** Port of _applyLifestyleFilter — drop high floors with no elevator. */
export function applyLifestyleFilter(
  input: ScoredWebProperty[],
  persona: Persona,
): ScoredWebProperty[] {
  if (!needsElevator(persona)) return input
  const cap = persona.baby ? 1 : 2
  return input.filter((r) => {
    const p = r.property
    if (propertyHasFeature(p, 'feat_elevator')) return true
    const floor = floorNumber(p)
    if (floor === null) return true // unknown floor → don't over-filter
    return floor <= cap
  })
}

const RELIGIOSITY_LABEL: Record<Religiosity, string> = {
  secular: 'חילוני',
  traditional: 'מסורתי',
  religious: 'דתי',
  haredi: 'חרדי',
}

/** Port of _lifestyleNote. */
export function lifestyleNote(persona: Persona): string | null {
  const parts: string[] = []
  if (persona.religiosity !== null) {
    parts.push(`נתתי עדיפות לאזורים שמתאימים לאורח חיים ${RELIGIOSITY_LABEL[persona.religiosity]}`)
  }
  if (needsElevator(persona)) parts.push('ודילגתי על קומות גבוהות בלי מעלית 🛗')
  if (parts.length === 0) return null
  return `שמתי לב לכמה דברים: ${parts.join(', ')}.`
}

// ─────────────────────────────────────────────────────────────────────────────
// Cohort signals — port of _cohortSignals (the persona OVERRIDES layered on top
// of SmartSearch.cohortSignals)
// ─────────────────────────────────────────────────────────────────────────────

export function cohortSignals(conversationText: string, persona: Persona): Record<string, string> {
  const s = baseCohortSignals(conversationText)
  if (persona.religiosity === 'haredi') {
    s.religiousStream = 'charedi'
    s.isReligious = 'true'
  } else if (persona.religiosity === 'religious') {
    s.religiousStream ??= 'dati_leumi'
    s.isReligious = 'true'
  } else if (persona.religiosity === 'traditional') {
    s.isReligious = 'true'
  }
  if (persona.baby) {
    s.hasChildren = 'true'
    s.childAge ??= '1'
  }
  return s
}

// ─────────────────────────────────────────────────────────────────────────────
// Search gates — ports of _wantsResultsNow / _queryIsRich / _localAck /
// _instantReply
// ─────────────────────────────────────────────────────────────────────────────

const WANTS_NOW_RE = /תראה לי|תראי לי|הצג|בוא נראה|בואי נראה|תמצא לי|תמצאי לי|show me/

export function wantsResultsNow(t: string): boolean {
  return WANTS_NOW_RE.test(t)
}

/** Port of _queryIsRich — a city plus at least one concrete constraint. */
export function queryIsRich(q: ParsedQuery): boolean {
  return q.city !== null && (q.maxPrice !== null || q.minRooms !== null || q.amenities.size > 0)
}

/** Port of _localAck. */
export function localAck(q: ParsedQuery): string {
  if (queryIsEmpty(q)) return 'ספר/י לי מה מחפשים — עיר, תקציב, כמה חדרים, ומה חשוב לך 🙂'
  return 'קיבלתי 👍 עוד משהו שחשוב לך, או שאראה לך דירות עכשיו?'
}

/** Port of _clarifyingPrompt — the single most useful missing detail + chips. */
export function clarifyingPrompt(q: ParsedQuery): { text: string; chips: string[] } | null {
  if (q.city === null) {
    return { text: 'באיזה אזור או עיר לחפש?', chips: ['תל אביב', 'ירושלים', 'חיפה', 'מרכז'] }
  }
  if (q.maxPrice === null) {
    return { text: 'מה התקציב החודשי שלך?', chips: ['עד ₪5,000', 'עד ₪7,000', 'עד ₪9,000'] }
  }
  if (q.minRooms === null && q.maxRooms === null) {
    return { text: 'כמה חדרים אתם צריכים?', chips: ['2 חדרים', '3 חדרים', '4 חדרים'] }
  }
  return null
}

/** Port of _refineChips / _refinePromptChips + their two special chip labels. */
export const REFINE_YES = '✨ כן, בוא נדייק'
export const REFINE_NO = 'זה מצוין, תודה'

export function refineChips(q: ParsedQuery): string[] {
  const chips: string[] = []
  if (q.maxPrice !== null) chips.push(`עד ₪${Math.round(q.maxPrice * 0.85)}`)
  if (q.minRooms !== null) chips.push(`${Math.trunc(q.minRooms + 1)} חדרים`)
  if (!q.amenities.has('feat_parking')) chips.push('עם חניה')
  if (!q.nearTrain) chips.push('קרוב לרכבת')
  if (!q.amenities.has('feat_elevator')) chips.push('עם מעלית')
  return chips.slice(0, 4)
}

export function refinePromptChips(q: ParsedQuery): string[] {
  return refineChips(q).length === 0 ? [] : [REFINE_YES, REFINE_NO]
}

/** Port of _instantReply. */
export function instantReply(
  shouldSearch: boolean,
  results: ScoredWebProperty[],
  anyExact: boolean,
): string {
  if (!shouldSearch || results.length === 0) return ''
  return anyExact ? 'הנה מה שמצאתי בשבילך 👇' : 'הנה הכי קרובות למה שחיפשת 👇'
}

// ─────────────────────────────────────────────────────────────────────────────
// The personalization INTERVIEW — port of _nextInterviewQuestion (the real
// question bank, verbatim: same keys, same Hebrew, same "why", same chips,
// same most-decisive-first order) and the _send gate around it.
// ─────────────────────────────────────────────────────────────────────────────

export interface InterviewQuestion {
  key: string
  q: string
  why: string
  chips: string[]
}

/** Focused interview: at most 3 questions, then search (capped in _send). */
export const MAX_INTERVIEW_QUESTIONS = 3
export const INTERVIEW_INTRO = 'כמה שאלות קצרות כדי לדייק בשבילך 🙂\n\n'
/** Offered from the SECOND question on, so the user is never stuck. */
export const SKIP_CHIP = 'תראי לי דירות עכשיו'

export function nextInterviewQuestion(
  query: ParsedQuery,
  conversationText: string,
  persona: Persona,
  asked: Set<string>,
): InterviewQuestion | null {
  const s = cohortSignals(conversationText, persona)
  const household = s.household ?? null
  const out: InterviewQuestion[] = []
  const add = (key: string, q: string, why: string, chips: string[]) => {
    if (!asked.has(key)) out.push({ key, q, why, chips })
  }

  // 1) WHERE
  if (query.city === null && query.neighborhood === null) {
    add('area', 'באיזה אזור לחפש?', 'המיקום קובע כמעט הכל.', [
      'תל אביב', 'ירושלים', 'חיפה', 'מרכז/השרון', 'באר שבע',
    ])
  }
  // 2) HOW MUCH
  if (query.maxPrice === null) {
    add('budget', 'תקציב חודשי מקסימלי?', 'שאראה רק דירות אפשריות.', [
      'עד 4,000', '4,000-6,000', '6,000-9,000', 'מעל 9,000',
    ])
  }
  // 3) WHO (only while unknown)
  if (household === null) {
    add('household', 'מי גר בדירה?', 'קובע כמה חדרים וצרכים בשכונה.', [
      'לבד', 'זוג', 'משפחה עם ילדים', 'שותפים',
    ])
  }
  // The single most important factor — the always-relevant closer.
  add('priority', 'הכי חשוב לך בדירה?', 'זה מה שידחוף את ההצעות הנכונות למעלה.', [
    'מיקום מרכזי', 'שקט', 'תמורה למחיר', 'דירה מרווחת', 'קרוב לעבודה',
  ])

  return out.length === 0 ? null : out[0]
}

// ─────────────────────────────────────────────────────────────────────────────
// Anti-hallucination gate — port of _verifyResults (+ its _kCollapsedResults /
// _kMinResults constants) and _nearbySameFilters.
//
// PORT NOTE: the Dart resolves the town centre from the CBS registry
// (GovData.localityByName → lat/lon). The web has no coordinate registry, so the
// centre is derived from the catalogue itself (median lat/lon of the listings in
// that city). Unknown city → the geo half of the gate simply doesn't fire, which
// is the same fail-soft behaviour as the Dart's `loc == null`.
// ─────────────────────────────────────────────────────────────────────────────

const K_COLLAPSED_RESULTS = 5
const K_MIN_RESULTS = 4

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

export function cityCentre(
  catalogue: Property[],
  city: string | null,
): { lat: number; lon: number } | null {
  const c = city?.trim()
  if (!c) return null
  const key = cityKey(c)
  const pts = catalogue.filter(
    (p) =>
      p.city &&
      cityKey(p.city) === key &&
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lon) &&
      p.lat !== 0 &&
      p.lon !== 0,
  )
  if (pts.length === 0) return null
  return { lat: median(pts.map((p) => p.lat)), lon: median(pts.map((p) => p.lon)) }
}

export interface VerifiedResults {
  results: ScoredWebProperty[]
  /** propertyId → the Dart's `note` ("כ-12 ק״מ מ…" / "מעט מעל התקציב"). */
  notes: Record<string, string>
}

/** Port of _verifyResults. */
export function verifyResults(
  results: ScoredWebProperty[],
  query: ParsedQuery,
  catalogue: Property[],
): VerifiedResults {
  if (results.length === 0) return { results, notes: {} }

  const city = query.city?.trim() ?? null
  const loc = cityCentre(catalogue, city)
  const strictKm = query.intents.has(SearchIntent.cityArea) ? 20 : 15
  const wideKm = strictKm * 2 // still "nearby", just clearly labeled
  const cap = query.maxPrice ?? 0

  const strict: ScoredWebProperty[] = []
  const nearby: ScoredWebProperty[] = []
  const notes: Record<string, string> = {}

  for (const r of results) {
    const km = loc === null ? 0 : haversineKm(r.property.lat, r.property.lon, loc.lat, loc.lon)
    const price = r.property.price
    const geoFar = loc !== null && km > strictKm
    const geoWayFar = loc !== null && km > wideKm
    const over = cap > 0 && price > 0 && price > cap
    const wayOver = cap > 0 && price > 0 && price > cap * 1.35

    // Grossly off — never surface (honest "nothing exact" instead).
    if (geoWayFar || wayOver) continue

    if (!geoFar && !over) {
      strict.push(r)
      continue
    }
    const parts: string[] = []
    if (geoFar) parts.push(`כ-${Math.round(km)} ק״מ מ${city}`)
    if (over) parts.push('מעט מעל התקציב')
    notes[r.property.id] = parts.join(' · ')
    nearby.push({ ...r, exact: false })
  }

  if (strict.length >= K_COLLAPSED_RESULTS) return { results: strict, notes: {} }
  const topUp = nearby.slice(0, Math.max(0, Math.min(K_COLLAPSED_RESULTS - strict.length, nearby.length)))
  const kept: Record<string, string> = {}
  for (const r of topUp) kept[r.property.id] = notes[r.property.id]
  return { results: [...strict, ...topUp], notes: kept }
}

/** Port of _nearbySameFilters — same filters, town widened to [km]. */
export function nearbySameFilters(
  query: ParsedQuery,
  catalogue: Property[],
  persona: Persona,
  km = 10,
): ScoredWebProperty[] {
  const loc = cityCentre(catalogue, query.city)
  if (loc === null) return []
  const near = catalogue.filter(
    (p) => haversineKm(p.lat, p.lon, loc.lat, loc.lon) <= km,
  )
  if (near.length === 0) return []
  // Same query WITHOUT the town name → the city gate won't re-exclude the
  // neighbours; budget / rooms / features still apply.
  const q2: ParsedQuery = {
    ...emptyQuery(),
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    minRooms: query.minRooms,
    maxRooms: query.maxRooms,
    propertyType: query.propertyType,
    amenities: new Set(query.amenities),
    requiredFeatures: new Set(query.requiredFeatures),
    transactionType: query.transactionType,
    nearTrain: query.nearTrain,
    intents: new Set(query.intents),
  }
  return rankByLifestyle(
    applyLifestyleFilter(rankProperties(q2, near, 40), persona),
    query.rawText,
  ).slice(0, 10)
}

/**
 * The instant on-device pass — the exact composition _send runs before anything
 * touches the network: rank → lifestyle filter → lifestyle re-rank → take(10) →
 * verification gate.
 */
export function localSearch(
  query: ParsedQuery,
  catalogue: Property[],
  persona: Persona,
  conversationText: string,
): VerifiedResults {
  const ranked = rankByLifestyle(
    applyLifestyleFilter(rankProperties(query, catalogue, 40), persona),
    conversationText,
  ).slice(0, 10)
  return verifyResults(ranked, query, catalogue)
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND — cohort ranking. Port of _cohortRanked + PropertySearchRepository
// .search(): the SAME /properties listing endpoint, called WITH the cohort
// signals as query params so the server's resolveCohort + attachRankSignals rank
// with the 14-cohort taxonomy + community_fit and return the listing order we
// then preserve.
//
// NB: this deliberately does NOT go through /api/listings — that cached route
// requests rank=0 and strips rankSignals/rankFeatures, i.e. exactly the
// personalization signal we need here. /api/listings stays the FAST-mode source.
// ─────────────────────────────────────────────────────────────────────────────

const COHORT_TIMEOUT_MS = 9_000

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

/** A listing row as the cohort endpoint returns it — carries the engine's score. */
export type CohortProperty = Property & { rankScore?: number }

/** Raw cohort-scored listings from the server (unsorted — see cohortRanked). */
export async function fetchCohortListings(
  query: ParsedQuery,
  signals: Record<string, string>,
  limit = 60,
): Promise<CohortProperty[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), COHORT_TIMEOUT_MS)
  try {
    const params = new URLSearchParams({
      status: 'active',
      limit: String(limit < 60 ? 60 : limit),
      order: 'desc',
    })
    if (query.city && query.city.trim()) params.set('city', query.city.trim())
    // The cohort signals ride as query params — verbatim, exactly as the Dart
    // hands `cohortParams` to listRows(params: …).
    for (const [k, v] of Object.entries(signals)) {
      if (v !== null && v !== undefined && `${v}`.trim() !== '') params.set(k, `${v}`)
    }
    const token = await getToken()
    // %20 rather than '+' for spaces — a Hebrew city name must survive API
    // Gateway's query-string decoding verbatim.
    const qs = params.toString().replace(/\+/g, '%20')
    const res = await fetch(`${BASE}/properties?${qs}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })
    if (!res.ok) return []
    const data = await res.json()
    const raw = data.items ?? data ?? []
    return (Array.isArray(raw) ? raw : [])
      .filter((p: CohortProperty) => p && p.id && typeof p.price === 'number')
      .map((p: CohortProperty) => ({
        ...p,
        media: coerceList<{ url: string; type?: string }>(p.media),
        imageUrls: coerceList<string>(p.imageUrls),
        smartTags: coerceList<string>(p.smartTags),
      }))
  } catch {
    return [] // fail-soft — the local rank still stands
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Space/case-insensitive city match, tolerant of partials ("תל אביב" vs
 * "תל אביב - יפו"). Verbatim port of PropertySearchRepository._cityMatches.
 */
function cityMatches(propertyCity: string, wanted: string): boolean {
  const a = propertyCity.trim()
  const b = wanted.trim()
  if (a === '') return false
  return a === b || a.includes(b) || b.includes(a)
}

/**
 * Port of _filterAndRank's `matched` gate. The backend's GSI filters by STATUS,
 * not city — the `city` query param is a no-op server-side (verified live: a
 * city-scoped call still returns nationwide rows), so the hard constraints MUST
 * be enforced here or the cohort swap-in would surface wrong-city listings.
 */
function filterCohortCandidates(items: CohortProperty[], q: ParsedQuery): CohortProperty[] {
  const wantCity = q.city?.trim() ?? ''
  return items.filter((p) => {
    if (p.isActive === false) return false
    if (wantCity !== '' && !cityMatches(p.city ?? '', wantCity)) return false
    if (q.minPrice !== null && p.price < q.minPrice) return false
    if (q.maxPrice !== null && p.price > q.maxPrice) return false
    if (q.minRooms !== null && (p.rooms ?? 0) < q.minRooms) return false
    if (q.maxRooms !== null && (p.rooms ?? 0) > q.maxRooms) return false
    for (const key of q.amenities) if (!propertyHasFeature(p, key)) return false
    return true
  })
}

/**
 * Port of _cohortRanked (+ PropertySearchRepository._filterAndRank's sort).
 * Routes candidates through the BACKEND cohort engine, enforces the hard
 * constraints client-side, orders by the per-listing `rankScore` the backend's
 * attachRankSignals attached (14-cohort taxonomy + community_fit) — falling back
 * to the on-device score for any candidate the backend didn't rank — then
 * decorates with the on-device scorecards so the cards look identical.
 * Falls back to the pure on-device rank when the backend gives us nothing, and
 * tops up to [K_MIN_RESULTS] with the local engine's closest near-misses.
 */
export async function cohortRanked(opts: {
  query: ParsedQuery
  conversationText: string
  persona: Persona
  catalogue: Property[]
  limit?: number
}): Promise<ScoredWebProperty[]> {
  const { query, conversationText, persona, catalogue } = opts
  const limit = opts.limit ?? 40
  const signals = cohortSignals(conversationText, persona)

  const localRank = () => rankProperties(query, catalogue, limit)
  const serverRows = await fetchCohortListings(query, signals, limit)
  if (serverRows.length === 0) return localRank()

  const matched = filterCohortCandidates(serverRows, query)
  if (matched.length === 0) return localRank()

  // Decorate with the local engine's score/tags…
  const scored = rankProperties(query, matched, matched.length)
  const byId = new Map(scored.map((s) => [s.property.id, s]))
  // …then order by the BACKEND's rankScore (client score as the fallback key).
  const ordered = [...matched].sort((a, b) => {
    const ka = typeof a.rankScore === 'number' ? a.rankScore : (byId.get(a.id)?.score ?? 0)
    const kb = typeof b.rankScore === 'number' ? b.rankScore : (byId.get(b.id)?.score ?? 0)
    return kb - ka
  })

  const out: ScoredWebProperty[] = []
  for (const p of ordered) {
    const s = byId.get(p.id)
    if (s) out.push(s)
    if (out.length >= limit) break
  }
  if (out.length === 0) return localRank()

  // Always give אתי a useful set to show — top up with the engine's closest
  // near-misses, deduped, up to _kMinResults.
  if (out.length < K_MIN_RESULTS) {
    const seen = new Set(out.map((s) => s.property.id))
    for (const s of localRank()) {
      if (!seen.has(s.property.id)) {
        seen.add(s.property.id)
        out.push(s)
        if (out.length >= K_MIN_RESULTS) break
      }
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND — Etti enrich. Port of _ettiEnrich (POST /assistant/extract).
//
// PORT NOTE: the web ParsedQuery has no soft-weights field, so only EttiPlan's
// hard_constraints are folded in — and only into GAPS, since the Dart re-overlays
// the deterministic on-device query on top (_merge(plan.toQuery(fallback), _query)),
// keeping what the user actually typed authoritative.
// ─────────────────────────────────────────────────────────────────────────────

const ENRICH_TIMEOUT_MS = 4_000

export async function ettiEnrich(text: string, query: ParsedQuery): Promise<ParsedQuery> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ENRICH_TIMEOUT_MS)
  try {
    const token = await getToken()
    const res = await fetch(`${BASE}/assistant/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query: text }),
      signal: controller.signal,
    })
    if (!res.ok) return query
    const data = await res.json()
    const hc = (data.hard_constraints ?? data.data?.hard_constraints ?? null) as Record<
      string,
      unknown
    > | null
    if (!hc) return query
    const s = (v: unknown): string | null => {
      const t = v == null ? '' : `${v}`.trim()
      return t === '' ? null : t
    }
    const n = (v: unknown): number | null => {
      if (typeof v === 'number' && Number.isFinite(v)) return v
      const p = parseFloat(`${v ?? ''}`)
      return Number.isFinite(p) ? p : null
    }
    // Gaps only — the deterministic parse stays AUTHORITATIVE.
    return {
      ...query,
      city: query.city ?? s(hc.city),
      maxPrice: query.maxPrice ?? n(hc.max_price ?? hc.maxPrice),
      minPrice: query.minPrice ?? n(hc.min_price ?? hc.minPrice),
      minRooms: query.minRooms ?? n(hc.min_rooms ?? hc.minRooms ?? hc.rooms),
      maxRooms: query.maxRooms ?? n(hc.max_rooms ?? hc.maxRooms),
    }
  } catch {
    return query // graceful — the on-device SmartSearch query already stands
  } finally {
    clearTimeout(timer)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND — the warm reply. Port of _serverReply (POST /assistant,
// mode 'tenant_search'), with the SAME local fallbacks (_localReply → _warmFallback).
// ─────────────────────────────────────────────────────────────────────────────

const REPLY_TIMEOUT_MS = 12_000

export interface WarmReply {
  reply: string
  suggestions: string[]
}

export async function serverReply(turns: ChatTurn[]): Promise<WarmReply | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REPLY_TIMEOUT_MS)
  try {
    const token = await getToken()
    const res = await fetch(`${BASE}/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages: turns.slice(-10), mode: 'tenant_search' }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    const reply: string = (data.reply ?? data.data?.reply ?? '').toString().trim()
    if (!reply) return null
    const rawSug = data.suggestions ?? data.data?.suggestions ?? []
    const suggestions: string[] = (Array.isArray(rawSug) ? rawSug : [])
      .map((x: unknown) => `${x}`.trim())
      .filter((x: string) => x.length > 0)
    return { reply, suggestions }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const HEBREW_RE = /[֐-׿]/

function money(v: number): string {
  return v.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1,')
}

const OPENERS = ['הבנתי 😊', 'מעולה, קלטתי', 'אחלה, הבנתי', 'סבבה, הבנתי']
const WARM_LINES = [
  'כיף, נשמע שיש לך כיוון 🙌 ספר לי עוד קצת — אזור, תקציב, כמה חדרים?',
  'הבנתי אותך. מה הכי חשוב לך בדירה או בשכונה?',
  'אהבתי. רוצה שאראה לך כבר כמה אפשרויות, או שנחדד עוד קצת?',
]

/** Port of _cohortFollowup — a fixed, reused library (no tokens). */
export function cohortFollowup(conversationText: string, persona: Persona): string {
  const s = cohortSignals(conversationText, persona)
  if (s.household === 'family' || persona.baby) {
    return 'מה הכי חשוב לכם — קרבה לגנים ובתי ספר, ממ״ד, או שקט?'
  }
  if (s.lifeStage === 'student' || s.household === 'student') {
    return 'מעדיפ/ה דירת שותפים או משהו לבד? וכמה קריטית הקרבה לאוניברסיטה?'
  }
  if (s.isInvestor === 'true') return 'זו השקעה לשכירות או לקנייה? ומה הכי חשוב לך בתשואה?'
  if (s.lifeStage === 'senior' || s.accessibilityNeed === 'true') {
    return 'חשוב מעלית וקומה נמוכה? וקרבה לשירותי בריאות?'
  }
  if (s.wfh === 'true') return 'צריך חדר עבודה נפרד ושקט? ואינטרנט מהיר?'
  if (persona.religiosity !== null || s.isReligious === 'true') {
    return 'חשוב לכם קרבה לבית כנסת ולמוסדות שמתאימים לכם?'
  }
  return 'מה עוד חשוב לך — אווירת שכונה, קומה, או משהו ספציפי בדירה?'
}

/** Port of _localReply — null when the input is non-Hebrew or too vague. */
export function localReply(opts: {
  query: ParsedQuery
  lastUserText: string
  conversationText: string
  persona: Persona
  searched: boolean
  userTurns: number
  openerIdx: number
}): string | null {
  const { query: q, lastUserText: text } = opts
  if (!text || !HEBREW_RE.test(text)) return null // → the model (language)

  const hasCriteria =
    q.city !== null ||
    q.maxPrice !== null ||
    q.minRooms !== null ||
    q.amenities.size > 0 ||
    q.nearTrain
  if (!hasCriteria) return null // greeting / ambiguous → the model

  const parts: string[] = []
  if (q.minRooms !== null) {
    const r = q.minRooms
    parts.push(`${r === Math.round(r) ? Math.trunc(r) : r} חדרים`)
  }
  if (q.city && q.city.trim()) parts.push(`ב${q.city.trim()}`)
  if (q.maxPrice !== null) parts.push(`עד ${money(q.maxPrice)} ₪`)
  const summary = parts.join(' ')
  const opener = OPENERS[opts.openerIdx % OPENERS.length]

  const enough = q.city !== null && (q.maxPrice !== null || q.minRooms !== null)
  if (enough || opts.searched || opts.userTurns >= 2) {
    return summary === ''
      ? `${opener}. בודקת מה הכי מתאים לך 👇`
      : `${opener} — ${summary}. בודקת מה הכי מתאים לך 👇`
  }
  const follow = cohortFollowup(opts.conversationText, opts.persona)
  return summary === '' ? `${opener}. ${follow}` : `${opener} — ${summary}. ${follow}`
}

/** Port of _warmFallback. */
export function warmFallback(idx: number): string {
  return WARM_LINES[idx % WARM_LINES.length]
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND — per-result explanations. Port of _fetchExplanations /
// RecommendationExplainer.explain (POST /assistant/explain).
//
// PORT NOTE: the web engine produces no Scorecard object, so each scorecard entry
// carries what the ported engine DOES compute (fit %, engine reasons, tags) plus
// the listing's real figures. Fully fail-soft: null → the engine's own
// "how I chose" fallback stays.
// ─────────────────────────────────────────────────────────────────────────────

const EXPLAIN_TIMEOUT_MS = 20_000

export interface Explanations {
  howIChose: string
  perProperty: Record<string, string>
}

export async function fetchExplanations(
  results: ScoredWebProperty[],
  query: ParsedQuery,
  persona: string[] = [],
): Promise<Explanations | null> {
  if (results.length === 0) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), EXPLAIN_TIMEOUT_MS)
  try {
    const scorecards = results.map((r) => ({
      propertyId: r.property.id,
      fitPct: r.matchPct ?? Math.round(Math.max(0, Math.min(1, r.score)) * 100),
      reasons: r.reasons,
      tags: r.tags,
      price: r.property.price,
      rooms: r.property.rooms,
      city: r.property.city ?? '',
      neighborhood: r.property.neighborhood ?? '',
    }))
    const token = await getToken()
    const res = await fetch(`${BASE}/assistant/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ persona, query: describeQuery(query), scorecards }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const decoded = await res.json()
    const data = decoded?.data && typeof decoded.data === 'object' ? decoded.data : decoded
    const raw = (data.reasons ?? data.perProperty ?? {}) as Record<string, unknown>
    const perProperty: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      const t = v == null ? '' : `${v}`.trim()
      if (t) perProperty[k] = t
    }
    const howIChose = `${data.howIChose ?? ''}`.trim()
    if (!howIChose && Object.keys(perProperty).length === 0) return null
    return { howIChose, perProperty }
  } catch {
    return null // timeout / failure → keep the engine's own reasons
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Port of _howIChoseFallback. The web engine carries no dimension breakdown, so
 * this is the Dart's own `cards.isEmpty` branch — verbatim — plus the top pick's
 * fit % when the advanced path produced one.
 */
export function howIChoseFallback(results: ScoredWebProperty[]): string {
  const base =
    'דירגתי כל דירה לפי ציון רב-ממדי — תמורה למחיר, מיקום, ' +
    'קרבה לתחבורה ובטיחות — והצפתי את ההתאמות הטובות ביותר.'
  const top = results[0]
  if (top?.matchPct === undefined) return base
  return `${base} בראש הרשימה ${top.matchPct}% התאמה.`
}
