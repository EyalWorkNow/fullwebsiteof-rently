// ═════════════════════════════════════════════════════════════════════════════
// Web port of the app's tenant SearchFilters (rental_models.dart:1897) and the
// hard-filter pass (dating_provider.dart _passesStructuralFilters +
// _passesStrictFitFilters). Same fields, same Hebrew labels, same
// missing-field semantics:
//   • unknown price (< ₪600) excluded unless includeUnknownPriceListings
//   • missing floor  → property KEPT (app: floorNumber != null check)
//   • missing size   → treated as 0 (kept by max-size, dropped by min-size)
//   • unknown city   → property KEPT (app: _cityMatches empty → true)
//   • missing entry date → fails every move-in window (app: entryDate != null)
// Do not "improve" behaviour here — fix the Dart first, then re-port.
//
// WIRE FORMAT (verified against the live /api/listings payload, 136 rows):
// DynamoDB hands back several list/map fields as JSON-ENCODED STRINGS, exactly
// like the app's _decodeStringListValue / PropertyFeatureSet.fromJson handle:
//   features      → string, 125 rows a JSON array of Hebrew labels,
//                            11 rows a JSON object of booleans
//   featureLabels → string, a JSON array (11 rows)
//   smartTags     → real array, empty on every row today
//   plus top-level feat_<catalogKey> booleans on 11 rows
// Anything reading these must decode first — see decodeStringList /
// enabledFeatureKeys.
// ═════════════════════════════════════════════════════════════════════════════

import type { Property } from '@/lib/live/types'

// lib/live/types.ts belongs to another module and under-describes the live row
// (features/featureLabels are typed as arrays but arrive as JSON strings, and
// createdAt / rankScore / feat_* aren't declared at all). Read the extra fields
// through an index view rather than widening a type this file doesn't own.
type RawRow = Record<string, unknown>
const raw = (p: Property): RawRow => p as unknown as RawRow

// ─────────────────────────────────────────────────────────────────────────────
// Filter model (port of SearchFilters — fields the tenant search actually uses)
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionType = 'any' | 'rent' | 'sale'
export type ListingSource = 'private' | 'agency'
export type MoveInOption = 'immediate' | 'within30' | 'within90'
export type SortOption =
  | 'bestMatch'
  | 'newest'
  | 'priceAsc'
  | 'priceDesc'
  | 'biggest'
  | 'entrySoonest'

export interface WebFilters {
  query: string
  transactionType: TransactionType
  minBudget: number
  maxBudget: number
  includeUnknownPriceListings: boolean
  minRooms: number // 0 = unset
  maxRooms: number // UNSET_MAX_ROOMS = unset
  minSizeM2: number // 0 = unset
  maxSizeM2: number // >= SIZE_SLIDER_MAX = unset (app stores 1,000,000)
  minFloor: number // 0 = unset (the app has ONLY a minimum floor)
  city: string // single-select, like the app
  propertyTypes: string[]
  conditions: string[]
  listingSources: ListingSource[]
  moveIn: MoveInOption[]
  requiredFeatures: string[] // canonical catalogue keys
  preferredNearby: string[] // NearbyKind names
  sortBy: SortOption
}

// App slider constants (discover_screen.dart _priceSliderMin/Max/Divisions,
// dating_provider.dart _unsetMaxRooms / _missingPriceThreshold).
export const UNSET_MAX_ROOMS = 10
export const SIZE_SLIDER_MAX = 2000
export const MISSING_PRICE_THRESHOLD = 600

export function priceBounds(t: TransactionType): { min: number; max: number; step: number } {
  return t === 'sale'
    ? { min: 100_000, max: 10_000_000, step: 100_000 }
    : { min: 600, max: 40_000, step: 200 }
}

export function defaultFilters(t: TransactionType = 'any'): WebFilters {
  const b = priceBounds(t)
  return {
    query: '',
    transactionType: t,
    minBudget: b.min,
    maxBudget: b.max,
    includeUnknownPriceListings: false,
    minRooms: 0,
    maxRooms: UNSET_MAX_ROOMS,
    minSizeM2: 0,
    maxSizeM2: SIZE_SLIDER_MAX,
    minFloor: 0,
    city: '',
    propertyTypes: [],
    conditions: [],
    listingSources: [],
    moveIn: [],
    requiredFeatures: [],
    preferredNearby: [],
    // App parity: the sheet opens on SearchSortOption.bestMatch
    // (discover_screen.dart:2420). Backed here by the row's own rankScore.
    sortBy: 'bestMatch',
  }
}

/** Port of _filtersForTransaction — switching rent/sale resets the price scale. */
export function withTransaction(f: WebFilters, t: TransactionType): WebFilters {
  const b = priceBounds(t)
  return { ...f, transactionType: t, minBudget: b.min, maxBudget: b.max }
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature catalogue — verbatim port of _propertyFeatureCatalog
// (rental_models.dart:2517), deduped by canonical key (the Dart list carries
// two 'parking' and two 'furnished' rows — first label wins, aliases merged).
// ─────────────────────────────────────────────────────────────────────────────

export interface FeatureDef {
  key: string
  label: string
  aliases: string[]
}

export const FEATURE_CATALOG: FeatureDef[] = [
  { key: 'balcony', label: 'מרפסת', aliases: ['balcony'] },
  { key: 'parking', label: 'חניה', aliases: ['parking', 'חניה מוצמדת', 'covered_parking', 'parking_spot'] },
  { key: 'storage', label: 'מחסן', aliases: ['storeroom', 'storage'] },
  { key: 'airConditioning', label: 'מזגן', aliases: ['air_conditioning'] },
  { key: 'mamad', label: 'ממ"ד', aliases: ['ממ״ד', 'safe_room'] },
  { key: 'sunBalcony', label: 'מרפסת שמש', aliases: [] },
  { key: 'garden', label: 'גינה', aliases: [] },
  { key: 'elevator', label: 'מעלית', aliases: ['elevator'] },
  { key: 'furnished', label: 'ריהוט', aliases: ['מרוהטת', 'מרוהט', 'furnished', 'ריהוט אופציונלי', 'optional_furniture', 'furniture_negotiable'] },
  { key: 'internetIncluded', label: 'אינטרנט כלול', aliases: [] },
  { key: 'equippedKitchen', label: 'מטבח מאובזר', aliases: [] },
  { key: 'petsAllowed', label: 'חיות מחמד מותר', aliases: ['חיות מחמד', 'pets_allowed'] },
  { key: 'laundryIncluded', label: 'כביסה כלולה', aliases: [] },
  { key: 'security', label: 'שומר/אבטחה', aliases: [] },
  { key: 'accessible', label: 'נגישות לנכים', aliases: ['גישה לנכים', 'handicapped_access'] },
  { key: 'sharedRoof', label: 'גג משותף', aliases: [] },
  { key: 'pool', label: 'בריכה', aliases: [] },
  { key: 'gym', label: 'חדר כושר', aliases: [] },
  { key: 'bars', label: 'סורגים', aliases: ['bars'] },
  { key: 'renovated', label: 'משופצת', aliases: ['renovated'] },
  { key: 'roommates', label: 'מתאימה לשותפים', aliases: ['for_roommates'] },
  { key: 'bombShelter', label: 'מקלט', aliases: ['bomb_shelter'] },
  { key: 'safeFloorSpace', label: 'מרחב מוגן קומתי', aliases: ['floor_level_shelter'] },
  { key: 'basement', label: 'מרתף', aliases: ['cellar', 'basement'] },
  { key: 'centralHeating', label: 'חימום מרכזי', aliases: ['heating', 'central_heating'] },
  { key: 'bedroomAc', label: 'מזגן בחדרי שינה', aliases: ['bedroom_ac', 'air_conditioning_bedrooms'] },
  { key: 'washingMachine', label: 'מכונת כביסה', aliases: ['washing_machine'] },
  { key: 'refrigerator', label: 'מקרר', aliases: ['fridge', 'refrigerator'] },
  { key: 'oven', label: 'תנור', aliases: ['oven', 'stove'] },
  { key: 'dishwasher', label: 'מדיח כלים', aliases: ['dishwasher', 'dish_washer'] },
  { key: 'smartHome', label: 'בקרה חכמה בבית', aliases: ['smart_home', 'home_automation'] },
  { key: 'undergroundParking', label: 'חניה תת קרקעית', aliases: ['underground_parking', 'basement_parking'] },
  { key: 'soundSystem', label: 'מערכת סאונד', aliases: ['sound_system', 'audio_system'] },
  { key: 'privateEntrance', label: 'כניסה פרטית', aliases: ['private_entrance'] },
  { key: 'cctv', label: 'מצלמות אבטחה', aliases: ['cctv', 'security_camera', 'camera'] },
  { key: 'alarmSystem', label: 'מערכת אזעקה', aliases: ['alarm', 'alarm_system', 'security_system'] },
  { key: 'intercom', label: 'אינטרקום', aliases: ['intercom', 'buzzer', 'video_intercom'] },
  { key: 'electricity', label: 'חשמל כלול', aliases: ['electricity', 'utilities_included'] },
  { key: 'water', label: 'מים כלולים', aliases: ['water', 'water_included'] },
  { key: 'naturalLight', label: 'אור טבעי', aliases: ['natural_light', 'sunlight', 'bright'] },
  { key: 'quietArea', label: 'אזור שקט', aliases: ['quiet', 'quiet_area', 'peaceful'] },
  { key: 'petFriendly', label: 'מתאים לחיות מחמד', aliases: ['pet_friendly', 'pets_allowed', 'animals'] },
  { key: 'secureEntrance', label: 'כניסה מאובטחת', aliases: ['secure_entrance', 'gated', 'gated_community'] },
  { key: 'publicTransport', label: 'קרוב לתחבורה ציבורית', aliases: ['public_transport', 'bus', 'train', 'transit'] },
  { key: 'nearSea', label: 'קרוב לים', aliases: ['near_sea', 'sea', 'beach', 'קרוב לחוף'] },
  { key: 'nearPark', label: 'קרוב לפארק', aliases: ['near_park', 'park', 'קרוב לגן', 'גן ציבורי'] },
]

export const FEATURE_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  FEATURE_CATALOG.map((d) => [d.key, d.label]),
)

// Legacy feat_* → catalogue key (feature_engineering.dart, mirrored from the
// same map inside lib/live/smart-search.ts — which does not export it).
const FEAT_ALIAS_TO_CATALOG_KEY: Record<string, string> = {
  feat_renovated: 'renovated',
  feat_pets: 'petsAllowed',
  feat_parking: 'parking',
  feat_balcony: 'balcony',
  feat_elevator: 'elevator',
  feat_furnished: 'furnished',
  feat_mamad: 'mamad',
  feat_garden: 'garden',
  feat_air: 'airConditioning',
  feat_pool: 'pool',
  feat_gym: 'gym',
  feat_storage: 'storage',
  feat_sun: 'sunBalcony',
  feat_safe: 'bars',
  feat_internet: 'internetIncluded',
  feat_laundry: 'washingMachine',
  feat_accessible: 'accessible',
  feat_roommates: 'roommates',
}

function normalizeFeatureToken(value: string): string {
  return value.trim().toLowerCase().replace(/״/g, '"').replace(/['"]/g, '')
}

// key / label / every alias → canonical key (port of _featureAliasLookup).
const ALIAS_LOOKUP: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const def of FEATURE_CATALOG) {
    out[normalizeFeatureToken(def.key)] = def.key
    out[normalizeFeatureToken(def.label)] = def.key
    for (const alias of def.aliases) out[normalizeFeatureToken(alias)] = def.key
  }
  return out
})()

/** Resolve any token (canonical key / feat_* / Hebrew label / alias) → key. */
export function canonicalFeatureKey(token: string): string {
  if (token.startsWith('feat_')) {
    // The legacy short names (feat_air, feat_sun…) live in the map above; the
    // live rows instead carry feat_<catalogKey> (feat_airConditioning,
    // feat_sunBalcony…), so fall through to the alias lookup on the suffix.
    const mapped = FEAT_ALIAS_TO_CATALOG_KEY[token]
    if (mapped) return mapped
    const suffix = token.slice(5)
    return ALIAS_LOOKUP[normalizeFeatureToken(suffix)] ?? token
  }
  return ALIAS_LOOKUP[normalizeFeatureToken(token)] ?? token
}

// Strip the emoji prefix smartTags carry ('🌤️ מרפסת' → 'מרפסת').
function stripEmojiPrefix(tag: string): string {
  return tag.replace(/^[^֐-׿a-zA-Z0-9"״]+/u, '').trim()
}

/**
 * Port of _decodeStringListValue (rental_models.dart:2845): accepts a real
 * array, a JSON-encoded array string, or anything else (→ []).
 * The live API sends `features` and `featureLabels` as JSON STRINGS — before
 * this, `for (const l of p.featureLabels)` iterated the string CHARACTER BY
 * CHARACTER, so every feature chip and every feature filter was garbage.
 */
export function decodeStringList(rawValue: unknown): string[] {
  if (Array.isArray(rawValue)) {
    return rawValue.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
  }
  if (typeof rawValue === 'string' && rawValue.trim()) {
    try {
      const parsed: unknown = JSON.parse(rawValue)
      if (Array.isArray(parsed)) return decodeStringList(parsed)
    } catch {
      // not JSON — a bare label string is still a usable single value
      return [rawValue.trim()]
    }
  }
  return []
}

/** Same leniency as the Dart _asBoolFlag. */
function asBoolFlag(v: unknown): boolean {
  return v === true || v === 1 || v === 'true' || v === '1'
}

/**
 * All enabled canonical feature keys of a property. Mirrors
 * PropertyFeatureSet.fromJson: `features` may be a JSON-encoded string holding
 * either an array of Hebrew labels (125/136 live rows) or a map of booleans
 * (11/136), plus featureLabels, smartTags and top-level feat_* flags.
 */
export function enabledFeatureKeys(p: Property): Set<string> {
  const out = new Set<string>()
  const add = (token: string) => {
    const t = token.trim()
    if (t) out.add(canonicalFeatureKey(t))
  }

  const row = raw(p)

  // features: array | map | JSON string of either
  let features: unknown = row.features
  if (typeof features === 'string' && features.trim()) {
    try {
      features = JSON.parse(features)
    } catch {
      features = [features]
    }
  }
  if (Array.isArray(features)) {
    for (const item of features) if (typeof item === 'string') add(item)
  } else if (features && typeof features === 'object') {
    for (const [key, val] of Object.entries(features as RawRow)) {
      if (asBoolFlag(val)) add(key)
    }
  }

  for (const label of decodeStringList(row.featureLabels)) add(label)
  for (const tag of decodeStringList(row.smartTags)) {
    const clean = stripEmojiPrefix(tag)
    if (clean) add(clean)
  }
  // Top-level feat_<key> booleans (present on the 11 app-authored rows).
  for (const [key, val] of Object.entries(row)) {
    if (key.startsWith('feat_') && asBoolFlag(val)) add(key)
  }
  return out
}

/** Hebrew labels of a property's features, for the free-text haystack. */
function featureLabelsOf(p: Property): string[] {
  const out: string[] = []
  for (const key of enabledFeatureKeys(p)) out.push(FEATURE_LABEL_BY_KEY[key] ?? key)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Nearby kinds — verbatim labels from discover_screen.dart _nearbyPrefOptions
// ─────────────────────────────────────────────────────────────────────────────

export const NEARBY_OPTIONS: { kind: string; label: string }[] = [
  { kind: 'schools', label: 'בתי ספר' },
  { kind: 'kindergartens', label: 'גנים' },
  { kind: 'playgrounds', label: 'גני שעשועים' },
  { kind: 'parks', label: 'פארקים' },
  { kind: 'supermarkets', label: 'סופרים' },
  { kind: 'clinics', label: 'קופות חולים' },
  { kind: 'pharmacies', label: 'בתי מרקחת' },
  { kind: 'hospitals', label: 'בתי חולים' },
  { kind: 'transit', label: 'תחבורה ציבורית' },
  { kind: 'gyms', label: 'חדרי כושר' },
  { kind: 'pools', label: 'בריכות' },
  { kind: 'dining', label: 'מסעדות ובתי קפה' },
  { kind: 'nightlife', label: 'בילוי' },
  { kind: 'culture', label: 'תרבות' },
  { kind: 'synagogues', label: 'בתי כנסת' },
  { kind: 'dogParks', label: 'גינות כלבים' },
  { kind: 'coworking', label: 'חללי עבודה' },
  { kind: 'parking', label: 'חניונים' },
]

export const NEARBY_LABEL_BY_KIND: Record<string, string> = Object.fromEntries(
  NEARBY_OPTIONS.map((o) => [o.kind, o.label]),
)

// Nearby kinds that map onto a real property feature on the web (used as a
// soft ranking boost, like the app's nearbyKindToDimension→sharpen — never as
// a hard filter). Kinds without a web signal are stored but inert here.
export const NEARBY_TO_FEATURE: Record<string, string> = {
  transit: 'publicTransport',
  parks: 'nearPark',
  gyms: 'gym',
  pools: 'pool',
  parking: 'parking',
}

/** True when the kind can actually move the ranking with today's fields. */
export function nearbyHasSignal(kind: string): boolean {
  return kind in NEARBY_TO_FEATURE
}

// ─────────────────────────────────────────────────────────────────────────────
// Static option lists (Hebrew labels verbatim from the filter sheet)
// ─────────────────────────────────────────────────────────────────────────────

export const TRANSACTION_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'any', label: 'הכל' },
  { value: 'rent', label: 'שכירות' },
  { value: 'sale', label: 'קנייה' },
]

export const LISTING_SOURCE_OPTIONS: { value: ListingSource; label: string }[] = [
  { value: 'private', label: 'בעלים פרטיים' },
  { value: 'agency', label: 'תיווך בלבד' },
]

export const MOVE_IN_OPTIONS: { value: MoveInOption; label: string }[] = [
  { value: 'immediate', label: 'מיידי' },
  { value: 'within30', label: 'עד 30 יום' },
  { value: 'within90', label: 'עד 90 יום' },
]

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'bestMatch', label: 'התאמה חכמה' },
  { value: 'newest', label: 'החדשות ביותר' },
  { value: 'priceAsc', label: 'מחיר מהנמוך לגבוה' },
  { value: 'priceDesc', label: 'מחיר מהגבוה לנמוך' },
  { value: 'entrySoonest', label: 'כניסה הכי קרובה' },
  { value: 'biggest', label: 'הכי מרווחות' },
]

const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((o) => o.value))

// Quick city pills — same 7 as the app's מיקום section.
export const QUICK_CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'גבעתיים', 'רמת גן', 'הרצליה', 'ראשון לציון']

// Rooms chips: 1..6+ with halves.
export const ROOM_CHIPS: { value: number; label: string }[] = [
  { value: 1, label: '1' }, { value: 1.5, label: '1.5' }, { value: 2, label: '2' },
  { value: 2.5, label: '2.5' }, { value: 3, label: '3' }, { value: 3.5, label: '3.5' },
  { value: 4, label: '4' }, { value: 4.5, label: '4.5' }, { value: 5, label: '5' },
  { value: 5.5, label: '5.5' }, { value: 6, label: '6+' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Value formatting (port of discover_screen _formatCompactCurrency behavior)
// ─────────────────────────────────────────────────────────────────────────────

export function formatPrice(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    const formatted = Number.isInteger(millions)
      ? millions.toFixed(0)
      : millions.toFixed(1).replace(/\.0$/, '')
    return `₪${formatted}M`
  }
  if (value >= 100_000) return `₪${Math.round(value / 1000)}K`
  return `₪${value.toLocaleString('he-IL')}`
}

export function formatSize(value: number): string {
  return `${value.toLocaleString('he-IL')} מ״ר`
}

// ─────────────────────────────────────────────────────────────────────────────
// Property field helpers
// ─────────────────────────────────────────────────────────────────────────────

function hasKnownPrice(p: Property): boolean {
  return (p.price ?? 0) >= MISSING_PRICE_THRESHOLD
}

function isSale(p: Property): boolean {
  // 125/136 live rows carry no transactionType at all; the app's
  // _parseTransactionType defaults the same way (rent).
  return (p.transactionType ?? 'rent') === 'sale'
}

export function listingSourceOf(p: Property): ListingSource {
  return p.agencyListing === true ? 'agency' : 'private'
}

/** Parse the web floor string ('3', 'קומה 3', 'קרקע'…) → number | null. */
export function parseFloor(p: Property): number | null {
  const rawValue = (p.floor ?? '').toString().trim()
  if (!rawValue) return null
  if (rawValue.includes('קרקע')) return 0
  const m = rawValue.match(/-?\d+/)
  if (!m) return null
  const n = parseInt(m[0], 10)
  return Number.isFinite(n) ? n : null
}

const ENTRY_ISO_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})/
const ENTRY_DMY_RE = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/

/**
 * Entry date → Date | null.
 *
 * ponytail: deliberately NOT `new Date(raw)`. Three real problems with that on
 * the live payload:
 *   1. 125/136 rows look like "2026-05-26 00:00:00". V8 accepts that
 *      non-standard space-separated form; Safari/JSC returns Invalid Date — so
 *      on Safari every move-in filter silently returned ~nothing and
 *      "כניסה הכי קרובה" did not reorder at all.
 *   2. "01/08" (Israeli DD/MM, 2 rows) was parsed by V8 as 8 Jan **2001** —
 *      a valid-looking date 25 years in the past that jumped straight to the
 *      top of the entry-soonest sort. Its sibling "15/09" simply failed.
 *   3. 'גמיש' ("flexible") became null, i.e. excluded from EVERY move-in
 *      window. The app has the same hole (DateTime.tryParse('גמיש') == null)
 *      but it is plainly wrong for the seeker — a landlord writing "flexible"
 *      is saying any date works — so the web treats it like 'מיידי'.
 */
export function parseEntryDate(value: unknown, now: Date): Date | null {
  const s = (value ?? '').toString().trim()
  if (!s) return null
  if (s.includes('מייד') || s.includes('גמיש')) return now

  const iso = s.match(ENTRY_ISO_RE)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return Number.isNaN(d.getTime()) ? null : d
  }

  const dmy = s.match(ENTRY_DMY_RE)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    let year = dmy[3] ? Number(dmy[3]) : now.getFullYear()
    if (year < 100) year += 2000
    const d = new Date(year, month - 1, day)
    // Year-less "01/08" means the next 1 August, not one long past.
    if (!dmy[3] && d.getTime() < now.getTime() - 180 * 86_400_000) {
      d.setFullYear(year + 1)
    }
    return d
  }
  return null
}

function entryDateOf(p: Property, now: Date): Date | null {
  return parseEntryDate(raw(p).entryDate, now)
}

/** Listing creation time — present as clean ISO on 100% of live rows. */
export function createdAtOf(p: Property): number | null {
  const v = raw(p).createdAt
  if (typeof v === 'number' && Number.isFinite(v)) return v < 1e11 ? v * 1000 : v
  const s = (v ?? '').toString().trim()
  if (!s) return null
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

/** Backend relevance score (rankScore) — present on 100% of live rows. */
export function rankScoreOf(p: Property): number {
  const v = raw(p).rankScore
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

// City normalisation — port of dating_provider _normCity/_cityNameMatch
// ("תל אביב" ⊂ "תל אביב יפו", but "יבנה" ≠ "גן יבנה"; unknown → keep).
function normCity(s: string): string {
  let t = s.trim().toLowerCase().replace(/[־\-,]/g, ' ').replace(/\s+/g, ' ').trim()
  t = t.replace(/\sיפו$/, '').trim()
  return t
}

function cityNameMatch(a: string, b: string): boolean {
  if (a === b) return true
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a
  return longer.startsWith(`${shorter} `)
}

export function cityMatches(propertyCity: string, filterCity: string): boolean {
  const a = normCity(propertyCity)
  const b = normCity(filterCity)
  if (!a || !b) return true // unknown → don't exclude (app behavior)
  return cityNameMatch(a, b)
}

// ─────────────────────────────────────────────────────────────────────────────
// The filter pass — mirrors _passesStructuralFilters + _passesStrictFitFilters,
// with the app's default-budget guards from the best-match gate (so the 'הכל'
// transaction default budget of ₪600–40,000 doesn't wipe out sale listings).
// ─────────────────────────────────────────────────────────────────────────────

export function matchesMoveIn(p: Property, options: MoveInOption[], now: Date): boolean {
  if (!options.length) return true
  const entry = entryDateOf(p, now)
  if (entry === null) return false // app parity: no entry date → fails the window
  return options.some((opt) => entry.getTime() <= moveInDeadline(opt, now))
}

function moveInDeadline(opt: MoveInOption, now: Date): number {
  if (opt === 'immediate') return now.getTime()
  return now.getTime() + (opt === 'within30' ? 30 : 90) * 86_400_000
}

export function propertyPasses(p: Property, f: WebFilters, now: Date): boolean {
  // city
  if (f.city.trim() && !cityMatches(p.city ?? '', f.city)) return false

  // free-text query — mirrors RentalProperty.searchableText + .address
  const q = f.query.trim().toLowerCase()
  if (q) {
    const streetPart = p.streetNumber && p.streetNumber > 0 ? `${p.street ?? ''} ${p.streetNumber}` : (p.street ?? '')
    const hay = [
      p.city, p.neighborhood, streetPart, p.propertyType, p.condition, p.ownerName,
      isSale(p) ? 'מכירה' : 'השכרה',
      ...featureLabelsOf(p),
    ].join(' ').toLowerCase()
    if (!hay.includes(q)) return false
  }

  // transaction
  if (f.transactionType === 'rent' && isSale(p)) return false
  if (f.transactionType === 'sale' && !isSale(p)) return false

  // property type / condition (exact, like the app)
  if (f.propertyTypes.length && !f.propertyTypes.includes((p.propertyType ?? '').trim())) return false
  if (f.conditions.length && !f.conditions.includes((p.condition ?? '').trim())) return false

  // listing source
  if (f.listingSources.length && !f.listingSources.includes(listingSourceOf(p))) return false

  // required features — every selected key must be enabled
  if (f.requiredFeatures.length) {
    const enabled = enabledFeatureKeys(p)
    if (!f.requiredFeatures.every((key) => enabled.has(key))) return false
  }

  // price — unknown price gated by the toggle; bounds applied only when moved
  // off the defaults (the app's best-match default gate).
  const bounds = priceBounds(f.transactionType)
  if (!hasKnownPrice(p)) {
    if (!f.includeUnknownPriceListings) return false
  } else {
    // The `<= bounds.max` / `>= bounds.min` guards keep a budget left over from
    // the OTHER price scale from acting as a hard ceiling: a rent-scale
    // maxBudget of ₪40,000 is below the sale scale's ₪100,000 floor, so without
    // this it silently excluded every single sale listing. withTransaction()
    // and sanitizeFilters() both keep the invariant, but a stale value must not
    // be able to empty the page.
    if (f.minBudget > bounds.min && f.minBudget <= bounds.max && p.price < f.minBudget) return false
    if (f.maxBudget < bounds.max && f.maxBudget >= bounds.min && p.price > f.maxBudget) return false
  }

  // rooms
  if (f.minRooms > 0 && (p.rooms ?? 0) < f.minRooms) return false
  if (f.maxRooms < UNSET_MAX_ROOMS && (p.rooms ?? 0) > f.maxRooms) return false

  // size — missing size counts as 0 (kept by max, dropped by min: app behavior)
  const size = p.sizeM2 ?? 0
  if (f.minSizeM2 > 0 && size < f.minSizeM2) return false
  if (f.maxSizeM2 < SIZE_SLIDER_MAX && size > f.maxSizeM2) return false

  // floor — properties with no parsable floor are KEPT (app null-check)
  if (f.minFloor > 0) {
    const floor = parseFloor(p)
    if (floor !== null && floor < f.minFloor) return false
  }

  // move-in
  if (!matchesMoveIn(p, f.moveIn, now)) return false

  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────────────────────────────────────

/** Soft nearby boost — the app's nearbyKindToDimension→sharpen, web-side. */
export function nearbyBoost(p: Property, preferredNearby: string[]): number {
  if (!preferredNearby.length) return 0
  const enabled = enabledFeatureKeys(p)
  let n = 0
  for (const kind of preferredNearby) {
    const feat = NEARBY_TO_FEATURE[kind]
    if (feat && enabled.has(feat)) n++
  }
  return n
}

/**
 * Sort a result list. Array#sort is stable (ES2019), so equal keys keep the
 * API order — which is already createdAt-desc.
 */
export function sortProperties(items: Property[], f: WebFilters, now: Date): Property[] {
  const out = items.slice()
  switch (f.sortBy) {
    case 'priceAsc':
      return out.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    case 'priceDesc':
      return out.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    case 'biggest':
      return out.sort((a, b) => (b.sizeM2 ?? 0) - (a.sizeM2 ?? 0))
    case 'entrySoonest': {
      // Soonest first; rows with no usable entry date go last (not first).
      const key = new Map<string, number>()
      for (const p of out) key.set(p.id, entryDateOf(p, now)?.getTime() ?? Number.MAX_SAFE_INTEGER)
      return out.sort((a, b) => (key.get(a.id) ?? 0) - (key.get(b.id) ?? 0))
    }
    case 'newest': {
      // Was unimplemented — 'newest' fell through to the nearby branch and did
      // nothing at all. createdAt is ISO on 100% of live rows.
      const key = new Map<string, number>()
      for (const p of out) key.set(p.id, createdAtOf(p) ?? 0)
      return out.sort((a, b) => (key.get(b.id) ?? 0) - (key.get(a.id) ?? 0))
    }
    case 'bestMatch':
    default: {
      const key = new Map<string, [number, number, number]>()
      for (const p of out) {
        key.set(p.id, [nearbyBoost(p, f.preferredNearby), rankScoreOf(p), createdAtOf(p) ?? 0])
      }
      const zero: [number, number, number] = [0, 0, 0]
      return out.sort((a, b) => {
        const x = key.get(a.id) ?? zero
        const y = key.get(b.id) ?? zero
        return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]
      })
    }
  }
}

export function applyFilters(items: Property[], f: WebFilters, now = new Date()): Property[] {
  return sortProperties(items.filter((p) => propertyPasses(p, f, now)), f, now)
}

// ─────────────────────────────────────────────────────────────────────────────
// Facet counts — "how many results would this option give me", computed with
// the option's OWN facet cleared (standard facet semantics), so a chip never
// reports 0 just because a sibling chip is selected. One pass per facet.
// ─────────────────────────────────────────────────────────────────────────────

export interface FacetCounts {
  total: number
  transaction: Record<string, number>
  propertyType: Record<string, number>
  condition: Record<string, number>
  listingSource: Record<string, number>
  moveIn: Record<string, number>
  feature: Record<string, number>
  city: Record<string, number>
}

function bump(rec: Record<string, number>, key: string) {
  rec[key] = (rec[key] ?? 0) + 1
}

export function facetCounts(items: Property[], f: WebFilters, now = new Date()): FacetCounts {
  const out: FacetCounts = {
    total: 0,
    transaction: {},
    propertyType: {},
    condition: {},
    listingSource: {},
    moveIn: {},
    feature: {},
    city: {},
  }

  // Transaction needs a full pass per option: switching it also resets the
  // price scale (withTransaction), so it isn't a plain bucket of the row value.
  for (const opt of TRANSACTION_OPTIONS) {
    const scoped = withTransaction(f, opt.value)
    out.transaction[opt.value] = items.reduce((n, p) => n + (propertyPasses(p, scoped, now) ? 1 : 0), 0)
  }
  out.total = items.reduce((n, p) => n + (propertyPasses(p, f, now) ? 1 : 0), 0)

  const scan = (patch: Partial<WebFilters>, take: (p: Property) => void) => {
    const scoped = { ...f, ...patch }
    for (const p of items) if (propertyPasses(p, scoped, now)) take(p)
  }

  scan({ propertyTypes: [] }, (p) => {
    const t = (p.propertyType ?? '').trim()
    if (t) bump(out.propertyType, t)
  })
  scan({ conditions: [] }, (p) => {
    const c = (p.condition ?? '').trim()
    if (c) bump(out.condition, c)
  })
  scan({ listingSources: [] }, (p) => bump(out.listingSource, listingSourceOf(p)))
  scan({ moveIn: [] }, (p) => {
    for (const opt of MOVE_IN_OPTIONS) {
      if (matchesMoveIn(p, [opt.value], now)) bump(out.moveIn, opt.value)
    }
  })
  scan({ requiredFeatures: [] }, (p) => {
    for (const key of enabledFeatureKeys(p)) bump(out.feature, key)
  })
  scan({ city: '' }, (p) => {
    const c = (p.city ?? '').trim()
    if (c) bump(out.city, c)
  })

  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Active-filter accounting (per-section badges + total, app activeFilterCount)
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionCounts {
  transaction: number
  price: number
  rooms: number
  location: number
  size: number
  floor: number
  propertyType: number
  condition: number
  listingSource: number
  moveIn: number
  features: number
  nearby: number
}

/**
 * A range counts as ONE active filter, not two. The old version scored the min
 * and max thumbs separately, so nudging a single price range showed a badge of
 * "2" (or "3" with the unknown-price toggle) — the header badge did not match
 * how many things the user had actually changed.
 */
export function sectionCounts(f: WebFilters): SectionCounts {
  const bounds = priceBounds(f.transactionType)
  return {
    transaction: f.transactionType !== 'any' ? 1 : 0,
    price:
      (f.minBudget > bounds.min || f.maxBudget < bounds.max ? 1 : 0) +
      (f.includeUnknownPriceListings ? 1 : 0),
    rooms: f.minRooms > 0 || f.maxRooms < UNSET_MAX_ROOMS ? 1 : 0,
    location: f.city.trim() ? 1 : 0,
    size: f.minSizeM2 > 0 || f.maxSizeM2 < SIZE_SLIDER_MAX ? 1 : 0,
    floor: f.minFloor > 0 ? 1 : 0,
    propertyType: f.propertyTypes.length,
    condition: f.conditions.length,
    listingSource: f.listingSources.length,
    moveIn: f.moveIn.length,
    features: f.requiredFeatures.length,
    nearby: f.preferredNearby.length,
  }
}

export function activeFilterCount(f: WebFilters): number {
  const c = sectionCounts(f)
  return (
    c.transaction + c.price + c.rooms + c.location + c.size + c.floor +
    c.propertyType + c.condition + c.listingSource + c.moveIn + c.features + c.nearby +
    (f.query.trim() ? 1 : 0)
  )
}

/** One removable chip per active filter, for the summary row above results. */
export interface ActiveFilterChip {
  id: string
  label: string
  clear: (f: WebFilters) => WebFilters
}

export function describeActiveFilters(f: WebFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = []
  const bounds = priceBounds(f.transactionType)

  if (f.query.trim()) {
    chips.push({ id: 'query', label: `חיפוש: ${f.query.trim()}`, clear: (x) => ({ ...x, query: '' }) })
  }
  if (f.transactionType !== 'any') {
    const label = TRANSACTION_OPTIONS.find((o) => o.value === f.transactionType)?.label ?? ''
    chips.push({ id: 'transaction', label, clear: (x) => withTransaction(x, 'any') })
  }
  if (f.city.trim()) {
    chips.push({ id: 'city', label: f.city.trim(), clear: (x) => ({ ...x, city: '' }) })
  }
  if (f.minBudget > bounds.min || f.maxBudget < bounds.max) {
    const lo = f.minBudget > bounds.min ? formatPrice(f.minBudget) : formatPrice(bounds.min)
    const hi = f.maxBudget < bounds.max ? formatPrice(f.maxBudget) : 'ללא הגבלה'
    chips.push({
      id: 'price',
      label: `מחיר ${lo}–${hi}`,
      clear: (x) => ({ ...x, minBudget: bounds.min, maxBudget: bounds.max }),
    })
  }
  if (f.includeUnknownPriceListings) {
    chips.push({
      id: 'unknownPrice',
      label: 'כולל ללא מחיר',
      clear: (x) => ({ ...x, includeUnknownPriceListings: false }),
    })
  }
  if (f.minRooms > 0 || f.maxRooms < UNSET_MAX_ROOMS) {
    const label = f.maxRooms >= UNSET_MAX_ROOMS ? `${f.minRooms}+ חדרים` : `${f.minRooms}–${f.maxRooms} חדרים`
    chips.push({ id: 'rooms', label, clear: (x) => ({ ...x, minRooms: 0, maxRooms: UNSET_MAX_ROOMS }) })
  }
  if (f.minSizeM2 > 0 || f.maxSizeM2 < SIZE_SLIDER_MAX) {
    const hi = f.maxSizeM2 < SIZE_SLIDER_MAX ? formatSize(f.maxSizeM2) : 'ללא הגבלה'
    chips.push({
      id: 'size',
      label: `גודל ${formatSize(f.minSizeM2)}–${hi}`,
      clear: (x) => ({ ...x, minSizeM2: 0, maxSizeM2: SIZE_SLIDER_MAX }),
    })
  }
  if (f.minFloor > 0) {
    chips.push({ id: 'floor', label: `קומה ${f.minFloor}+`, clear: (x) => ({ ...x, minFloor: 0 }) })
  }
  for (const t of f.propertyTypes) {
    chips.push({
      id: `propertyType:${t}`,
      label: t,
      clear: (x) => ({ ...x, propertyTypes: x.propertyTypes.filter((v) => v !== t) }),
    })
  }
  for (const c of f.conditions) {
    chips.push({
      id: `condition:${c}`,
      label: c,
      clear: (x) => ({ ...x, conditions: x.conditions.filter((v) => v !== c) }),
    })
  }
  for (const s of f.listingSources) {
    chips.push({
      id: `listingSource:${s}`,
      label: LISTING_SOURCE_OPTIONS.find((o) => o.value === s)?.label ?? s,
      clear: (x) => ({ ...x, listingSources: x.listingSources.filter((v) => v !== s) }),
    })
  }
  for (const m of f.moveIn) {
    chips.push({
      id: `moveIn:${m}`,
      label: `כניסה ${MOVE_IN_OPTIONS.find((o) => o.value === m)?.label ?? m}`,
      clear: (x) => ({ ...x, moveIn: x.moveIn.filter((v) => v !== m) }),
    })
  }
  for (const k of f.requiredFeatures) {
    chips.push({
      id: `feature:${k}`,
      label: FEATURE_LABEL_BY_KEY[k] ?? k,
      clear: (x) => ({ ...x, requiredFeatures: x.requiredFeatures.filter((v) => v !== k) }),
    })
  }
  for (const n of f.preferredNearby) {
    chips.push({
      id: `nearby:${n}`,
      label: `בסביבה: ${NEARBY_LABEL_BY_KIND[n] ?? n}`,
      clear: (x) => ({ ...x, preferredNearby: x.preferredNearby.filter((v) => v !== n) }),
    })
  }
  return chips
}

// ─────────────────────────────────────────────────────────────────────────────
// sessionStorage persistence (back-navigation keeps the filters)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rently.realEstate.filters.v1'

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function enumList<T extends string>(v: unknown, allowed: readonly T[]): T[] {
  return strList(v).filter((x): x is T => (allowed as readonly string[]).includes(x))
}

/**
 * Coerce an arbitrary parsed blob into a valid WebFilters. A stored payload can
 * be older than the code (or hand-edited): before this, a stale `sortBy` left
 * the list unsorted with no signal, and a non-array `propertyTypes` threw on
 * `.length` and took the whole page down.
 */
export function sanitizeFilters(input: unknown): WebFilters {
  const d = defaultFilters()
  if (!input || typeof input !== 'object') return d
  const o = input as RawRow

  const transactionType: TransactionType =
    o.transactionType === 'rent' || o.transactionType === 'sale' ? o.transactionType : 'any'
  const bounds = priceBounds(transactionType)

  const minBudget = Math.min(Math.max(num(o.minBudget, bounds.min), bounds.min), bounds.max)
  const maxBudget = Math.min(Math.max(num(o.maxBudget, bounds.max), minBudget), bounds.max)
  const minRooms = Math.min(Math.max(num(o.minRooms, 0), 0), UNSET_MAX_ROOMS)
  const maxRooms = Math.min(Math.max(num(o.maxRooms, UNSET_MAX_ROOMS), minRooms), UNSET_MAX_ROOMS)
  const minSizeM2 = Math.min(Math.max(num(o.minSizeM2, 0), 0), SIZE_SLIDER_MAX)
  const maxSizeM2 = Math.min(Math.max(num(o.maxSizeM2, SIZE_SLIDER_MAX), minSizeM2), SIZE_SLIDER_MAX)

  return {
    query: typeof o.query === 'string' ? o.query : '',
    transactionType,
    minBudget,
    maxBudget,
    includeUnknownPriceListings: o.includeUnknownPriceListings === true,
    minRooms,
    maxRooms,
    minSizeM2,
    maxSizeM2,
    minFloor: Math.min(Math.max(Math.round(num(o.minFloor, 0)), 0), 60),
    city: typeof o.city === 'string' ? o.city : '',
    propertyTypes: strList(o.propertyTypes),
    conditions: strList(o.conditions),
    listingSources: enumList<ListingSource>(o.listingSources, ['private', 'agency']),
    moveIn: enumList<MoveInOption>(o.moveIn, ['immediate', 'within30', 'within90']),
    requiredFeatures: strList(o.requiredFeatures),
    preferredNearby: strList(o.preferredNearby).filter((k) => k in NEARBY_LABEL_BY_KIND),
    sortBy: typeof o.sortBy === 'string' && SORT_VALUES.has(o.sortBy) ? (o.sortBy as SortOption) : d.sortBy,
  }
}

export function loadStoredFilters(): WebFilters | null {
  if (typeof window === 'undefined') return null
  try {
    const rawValue = window.sessionStorage.getItem(STORAGE_KEY)
    if (!rawValue) return null
    return sanitizeFilters(JSON.parse(rawValue))
  } catch {
    return null
  }
}

export function storeFilters(f: WebFilters): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(f))
  } catch {
    // storage full/blocked — non-fatal
  }
}

// Whether the filter panel is expanded. sessionStorage (not local) is exactly
// the wanted lifetime: it survives navigating to a listing and back, and a new
// session always starts collapsed.
const PANEL_KEY = 'rently.realEstate.filtersOpen.v1'

export function loadPanelOpen(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(PANEL_KEY) === '1'
  } catch {
    return false
  }
}

export function storePanelOpen(open: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(PANEL_KEY, open ? '1' : '0')
  } catch {
    // non-fatal
  }
}

// Toggle helper for string-array filter fields.
export function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/**
 * Natural language AI filter auto-fill parser.
 * Extracts rooms, budget, city, size, floor, features, and source from free Hebrew text.
 */
export function parseNaturalLanguageToFilters(rawText: string, current: WebFilters): WebFilters {
  const text = rawText.trim()
  if (!text) return current

  const updated: WebFilters = { ...current, requiredFeatures: [...current.requiredFeatures] }

  // 1. Rooms (e.g. "3 חדרים", "3.5 חדרים", "4 חד'")
  const roomsMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:חדרים|חדר|חד׳)/i)
  if (roomsMatch) {
    const numRooms = parseFloat(roomsMatch[1])
    if (!isNaN(numRooms)) {
      updated.minRooms = numRooms
      updated.maxRooms = numRooms
    }
  }

  // 2. Max Budget (e.g. "עד 7,500 ₪", "עד 8000", "עד 7000 שח")
  const priceMatch = text.match(/(?:עד|מקסימום|תקציב)?\s*([1-9]\d{0,2}(?:,\d{3})+|[5-9]\d{3}|\d{5})\s*(?:ש"ח|₪|לחודש)?/i)
  if (priceMatch) {
    const parsedPrice = parseInt(priceMatch[1].replace(/,/g, ''), 10)
    if (!isNaN(parsedPrice) && parsedPrice >= 1000 && parsedPrice <= 50000) {
      updated.maxBudget = parsedPrice
    }
  }

  // 3. City (e.g. "בתל אביב", "בגבעתיים", "ברמת גן")
  const cities = [
    'תל אביב',
    'גבעתיים',
    'רמת גן',
    'ירושלים',
    'חיפה',
    'נתניה',
    'הרצליה',
    'ראשון לציון',
    'בת ים',
    'חולון',
    'פתח תקווה',
    'רעננה',
    'כפר סבא',
    'אשדוד',
    'באר שבע',
  ]
  for (const c of cities) {
    if (text.includes(c) || text.includes(`ב${c}`)) {
      updated.city = c
      break
    }
  }

  // 4. Size in m² (e.g. "80 מ"ר", "מ-100 מטר")
  const sizeMatch = text.match(/(\d+)\s*(?:מ"ר|מטר)/i)
  if (sizeMatch) {
    const size = parseInt(sizeMatch[1], 10)
    if (!isNaN(size) && size > 20) {
      updated.minSizeM2 = size
    }
  }

  // 5. Floor (e.g. "קומה 3", "מעל קומה 2")
  const floorMatch = text.match(/קומה\s*(\d+)/i)
  if (floorMatch) {
    const floor = parseInt(floorMatch[1], 10)
    if (!isNaN(floor)) {
      updated.minFloor = floor
    }
  }

  // 6. Direct / Agency (לא מתיווך / פרטי)
  if (text.includes('לא מתיווך') || text.includes('ללא תיווך') || text.includes('פרטי')) {
    updated.listingSources = ['private']
  } else if (text.includes('מתווך') || text.includes('מתיווך')) {
    updated.listingSources = ['agency']
  }

  // 7. Features
  const addFeat = (k: string) => {
    if (!updated.requiredFeatures.includes(k)) {
      updated.requiredFeatures.push(k)
    }
  }

  if (text.includes('מרפסת שמש')) addFeat('sunBalcony')
  else if (text.includes('מרפסת')) addFeat('balcony')

  if (text.includes('חניה') || text.includes('חנייה')) addFeat('parking')
  if (text.includes('מעלית')) addFeat('elevator')
  if (text.includes('ממ"ד') || text.includes('ממד')) addFeat('mamad')
  if (text.includes('מיזוג') || text.includes('מזגן')) addFeat('airConditioning')
  if (text.includes('סורגים')) addFeat('bars')
  if (text.includes('משופצת') || text.includes('משופץ')) addFeat('renovated')
  if (text.includes('חיות מחמד') || text.includes('מותר חיות') || text.includes('כלבים') || text.includes('חתולים')) addFeat('petsAllowed')
  if (text.includes('מרוהטת') || text.includes('מרוהט') || text.includes('ריהוט')) addFeat('furnished')
  if (text.includes('גינה')) addFeat('garden')
  if (text.includes('מחסן')) addFeat('storage')
  if (text.includes('שותפים') || text.includes('שותף')) addFeat('roommates')
  if (text.includes('נגישות') || text.includes('נגיש')) addFeat('accessible')

  return updated
}
