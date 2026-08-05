// Mirrors the backend property shape (rental_models.dart RentalProperty.toJson).
// NOTE: coordinates are `lat` + `lon` (not lng) as returned by the API.
export interface Property {
  id: string
  lat: number
  lon: number
  price: number
  rooms: number
  sizeM2?: number
  floor?: string
  city?: string
  neighborhood?: string
  street?: string
  propertyType?: string
  transactionType?: string // 'rent' | 'sale'
  status?: string
  imageUrls?: string[]
  media?: { url: string; type?: string }[]
  featureLabels?: string[]
  features?: string[] | Record<string, boolean>
  smartTags?: string[]
  isActive?: boolean
  totalFloors?: string
  streetNumber?: number
  entryDate?: string
  condition?: string
  ownerName?: string
  agencyListing?: boolean
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
}

export interface AssistantResponse {
  reply: string
  suggestions?: string[]
  listings?: Partial<Property>[]
  propertyDraft?: unknown
}

// A POI from the Overpass layer (retail / transit / parks…).
export interface Poi {
  id: number
  lat: number
  lon: number
  category: string
  name?: string
}

export function primaryImage(p: Property): string | undefined {
  if (p.imageUrls?.length) return p.imageUrls[0]
  if (Array.isArray(p.media)) {
    const img = p.media.find((m) => m && (m.type ?? 'image') === 'image')
    return img?.url
  }
  return undefined
}

export function priceLabel(p: Property): string {
  const n = p.price ?? 0
  return '₪' + n.toLocaleString('he-IL')
}

// ─────────────────────────────────────────────────────────────────────────────
// App-parity models (mirror the Flutter Dart models — keep keys identical).
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'tenant' | 'landlord' | 'broker'

/** Mirrors TenantProfile (rental_models.dart), incl. the Israeli-market
 *  lifestyle deal-breaker fields. All optional except identity. */
export interface TenantProfile {
  id: string
  name: string
  bio?: string
  photoUrls?: string[]
  budgetMax?: number
  desiredRooms?: number
  moveInWindow?: string
  importantDetails?: string[]
  dealBreakers?: string[]
  monthlyIncome?: number
  occupation?: string
  numChildren?: number
  hasPets?: boolean
  hasCar?: boolean
  wfh?: boolean
  household?: string
  lifeStage?: string
  isOleh?: boolean
  age?: number
  smoker?: boolean
  hasGuarantor?: boolean
  leaseMonths?: number
  incomeProofReady?: boolean
  // Lifestyle / religious deal-breakers
  religiousLifestyle?: string // chiloni | masorti | dati | charedi
  shabbatObservant?: boolean
  keepsKosher?: boolean
  petType?: string // none | cat | dog_small | dog_large | other
  hostsGuests?: boolean
  playsInstrument?: boolean
}

/** A tenant's like on a property (property_likes_repository.dart). */
export interface PropertyLike {
  propertyId: string
  tenantId: string
  tenantName: string
  tenantPhotoUrl?: string
  createdAt?: string
  budgetMax?: number
  age?: number
  occupation?: string
  verified?: boolean
  introMessage?: string
}

export interface Match {
  id: string
  propertyId: string
  property?: Property
  tenantId: string
  tenantName?: string
  tenantPhotoUrl?: string
  fitScore?: number
  lastMessage?: string
  unread?: number
  createdAt?: string
}

export interface ChatMessage {
  id?: string
  matchId: string
  senderId: string
  text: string
  createdAt?: string
  read?: boolean
}

export interface NotificationItem {
  id: string
  title: string
  body?: string
  createdAt?: string
  read?: boolean
  kind?: string
}

/** Shared lifestyle / pet-type contracts (mirror rental_models.dart maps). */
export const LIFESTYLE_LABELS: Record<string, string> = {
  chiloni: 'חילוני/ת', masorti: 'מסורתי/ת', dati: 'דתי/ה', charedi: 'חרדי/ת',
}
export const PET_TYPE_LABELS: Record<string, string> = {
  none: 'אין', cat: 'חתול', dog_small: 'כלב קטן', dog_large: 'כלב גדול', other: 'אחר',
}
