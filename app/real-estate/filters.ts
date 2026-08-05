// ═════════════════════════════════════════════════════════════════════════════
// Web port of the app's tenant SearchFilters (rental_models.dart:1897) and the
// hard-filter pass (dating_provider.dart _passesStructuralFilters +
// _passesStrictFitFilters). Same fields, same Hebrew labels, same
// missing-field semantics:
//   • unknown price (< ₪600) excluded unless includeUnknownPriceListings
//   • missing floor  → property KEPT (app: floorNumber != null check)
//   • missing size   → treated as 0 (kept by max-size, dropped by min-size)
//   • unknown city   → property KEPT (app: _cityMatches empty → true)
// Do not "improve" behaviour here — fix the Dart first, then re-port.
// ═════════════════════════════════════════════════════════════════════════════

import type { Property } from '@/lib/live/types'

// ─────────────────────────────────────────────────────────────────────────────
// Filter model (port of SearchFilters — fields the tenant search actually uses)
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionType = 'any' | 'rent' | 'sale'
export type ListingSource = 'private' | 'agency'
export type MoveInOption = 'immediate' | 'within30' | 'within90'
export type SortOption = 'newest' | 'priceAsc' | 'priceDesc' | 'biggest' | 'entrySoonest'

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
    sortBy: 'newest',
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
  if (token.startsWith('feat_')) return FEAT_ALIAS_TO_CATALOG_KEY[token] ?? token
  return ALIAS_LOOKUP[normalizeFeatureToken(token)] ?? token
}

// Strip the emoji prefix smartTags carry ('🌤️ מרפסת' → 'מרפסת').
function stripEmojiPrefix(tag: string): string {
  return tag.replace(/^[^֐-׿a-zA-Z0-9"״]+/u, '').trim()
}

/**
 * All enabled canonical feature keys of a property. Same resolution order the
 * app / smart-search use: features record (truthy) or array → featureLabels →
 * smartTags (Hebrew label with emoji prefix).
 */
export function enabledFeatureKeys(p: Property): Set<string> {
  const out = new Set<string>()
  const add = (token: string) => out.add(canonicalFeatureKey(token))
  const f = p.features
  if (Array.isArray(f)) {
    for (const item of f) if (typeof item === 'string') add(item)
  } else if (f && typeof f === 'object') {
    for (const [key, val] of Object.entries(f)) {
      const v = val as unknown
      if (v === true || v === 1 || v === 'true') add(key) // same leniency as the Dart _asBoolFlag
    }
  }
  for (const label of p.featureLabels ?? []) add(label)
  for (const tag of p.smartTags ?? []) {
    const clean = stripEmojiPrefix(tag)
    if (clean) add(clean)
  }
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

// Nearby kinds that map onto a real property feature on the web (used as a
// soft ranking boost, like the app's nearbyKindToDimension→sharpen — never as
// a hard filter). Kinds without a web signal are stored but inert here.
const NEARBY_TO_FEATURE: Record<string, string> = {
  transit: 'publicTransport',
  parks: 'nearPark',
  gyms: 'gym',
  pools: 'pool',
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
  { value: 'newest', label: 'החדשות ביותר' },
  { value: 'priceAsc', label: 'מחיר מהנמוך לגבוה' },
  { value: 'priceDesc', label: 'מחיר מהגבוה לנמוך' },
  { value: 'entrySoonest', label: 'כניסה הכי קרובה' },
  { value: 'biggest', label: 'הכי מרווחות' },
]

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

// ─────────────────────────────────────────────────────────────────────────────
// Property field helpers
// ─────────────────────────────────────────────────────────────────────────────

function hasKnownPrice(p: Property): boolean {
  return (p.price ?? 0) >= MISSING_PRICE_THRESHOLD
}

function isSale(p: Property): boolean {
  return (p.transactionType ?? 'rent') === 'sale'
}

export function listingSourceOf(p: Property): ListingSource {
  return p.agencyListing === true ? 'agency' : 'private'
}

/** Parse the web floor string ('3', 'קומה 3', 'קרקע'…) → number | null. */
export function parseFloor(p: Property): number | null {
  const raw = (p.floor ?? '').toString().trim()
  if (!raw) return null
  if (raw.includes('קרקע')) return 0
  const m = raw.match(/-?\d+/)
  if (!m) return null
  const n = parseInt(m[0], 10)
  return Number.isFinite(n) ? n : null
}

function entryDateOf(p: Property, now: Date): Date | null {
  const raw = (p.entryDate ?? '').toString().trim()
  if (!raw) return null
  if (raw.includes('מייד')) return now
  const d = new Date(raw)
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1972) return null
  return d
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

export function propertyPasses(p: Property, f: WebFilters, now: Date): boolean {
  // city
  if (f.city.trim() && !cityMatches(p.city ?? '', f.city)) return false

  // free-text query (over the fields the web has)
  const q = f.query.trim().toLowerCase()
  if (q) {
    const hay = `${p.city ?? ''} ${p.neighborhood ?? ''} ${p.street ?? ''} ${p.propertyType ?? ''}`.toLowerCase()
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
    if (f.minBudget > bounds.min && p.price < f.minBudget) return false
    if (f.maxBudget < bounds.max && p.price > f.maxBudget) return false
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

  // move-in — any() over the selected options; no entry date fails all options
  if (f.moveIn.length) {
    const entry = entryDateOf(p, now)
    const passes = f.moveIn.some((opt) => {
      const deadline =
        opt === 'immediate' ? now
        : opt === 'within30' ? new Date(now.getTime() + 30 * 86_400_000)
        : new Date(now.getTime() + 90 * 86_400_000)
      return entry !== null && entry.getTime() <= deadline.getTime()
    })
    if (!passes) return false
  }

  return true
}

export function applyFilters(items: Property[], f: WebFilters, now = new Date()): Property[] {
  const out = items.filter((p) => propertyPasses(p, f, now))

  if (f.sortBy === 'priceAsc') out.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
  else if (f.sortBy === 'priceDesc') out.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
  else if (f.sortBy === 'biggest') out.sort((a, b) => (b.sizeM2 ?? 0) - (a.sizeM2 ?? 0))
  else if (f.sortBy === 'entrySoonest') {
    const key = (p: Property) => entryDateOf(p, now)?.getTime() ?? Number.MAX_SAFE_INTEGER
    out.sort((a, b) => key(a) - key(b))
  } else if (f.preferredNearby.length) {
    // default order: soft nearby boost (stable) — mirrors the app's preference
    // boost; kinds without a web feature signal have no effect here.
    const boost = (p: Property) => {
      const enabled = enabledFeatureKeys(p)
      let n = 0
      for (const kind of f.preferredNearby) {
        const feat = NEARBY_TO_FEATURE[kind]
        if (feat && enabled.has(feat)) n++
      }
      return n
    }
    const scored = out.map((p, i) => ({ p, i, b: boost(p) }))
    scored.sort((x, y) => y.b - x.b || x.i - y.i)
    return scored.map((s) => s.p)
  }
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

export function sectionCounts(f: WebFilters): SectionCounts {
  const bounds = priceBounds(f.transactionType)
  return {
    transaction: f.transactionType !== 'any' ? 1 : 0,
    price:
      (f.minBudget > bounds.min ? 1 : 0) +
      (f.maxBudget < bounds.max ? 1 : 0) +
      (f.includeUnknownPriceListings ? 1 : 0),
    rooms: (f.minRooms > 0 ? 1 : 0) + (f.maxRooms < UNSET_MAX_ROOMS ? 1 : 0),
    location: f.city.trim() ? 1 : 0,
    size: (f.minSizeM2 > 0 ? 1 : 0) + (f.maxSizeM2 < SIZE_SLIDER_MAX ? 1 : 0),
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

// ─────────────────────────────────────────────────────────────────────────────
// sessionStorage persistence (back-navigation keeps the filters)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rently.realEstate.filters.v1'

export function loadStoredFilters(): WebFilters | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<WebFilters>
    return { ...defaultFilters(), ...parsed }
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

// Toggle helper for string-array filter fields.
export function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}
