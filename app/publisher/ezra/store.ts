// עזרא page — conversation persistence (localStorage) + Hebrew relative dates.
// Same schema shape / 50-conversation cap / guarded JSON.parse as app/ati/store.ts,
// under its own key so אתי and עזרא never share a history.
//
// Schema (key 'ezra-conversations'):
//   [{ id, title, createdAt, messages: [{ role: 'user'|'ezra', text, chips?, listingIds?, draftHere? }],
//      draft?, dirty?, publishedId? }]

import { DRAFT_KEYS, type DraftKey, type EzraDraftFields } from './ezra-api'

export interface EzraMessage {
  /** Stable id — the streaming reveal targets one bubble by id. */
  id?: string
  role: 'user' | 'ezra'
  text: string
  /** Suggestion chips from the server's `suggestions` (tap = send). */
  chips?: string[]
  /** Property ids to render as an inline card carousel (resolved at render time). */
  listingIds?: string[]
  /** true = this turn produced/refined the live draft; the card renders under the newest one. */
  draftHere?: boolean
  /** true = a failed turn (rendered as a soft error bubble). */
  error?: boolean
}

export function newMessageId(): string {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export interface EzraConversation {
  id: string
  title: string
  createdAt: number
  messages: EzraMessage[]
  /** The live publishing draft — merged across turns, edited in place. */
  draft?: EzraDraftFields | null
  /** Draft fields the landlord typed into; the assistant never overwrites these. */
  dirty?: DraftKey[]
  /** Set once the draft was published — the card turns into a confirmation. */
  publishedId?: string
}

const KEY = 'ezra-conversations'
const MAX_CONVERSATIONS = 50

function cleanDraft(v: unknown): EzraDraftFields | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const raw = v as Record<string, unknown>
  const s = (k: DraftKey) => (typeof raw[k] === 'string' ? (raw[k] as string) : '')
  return {
    city: s('city'),
    streetLine: s('streetLine'),
    rooms: s('rooms'),
    sizeM2: s('sizeM2'),
    floor: s('floor'),
    price: s('price'),
    transactionType: raw.transactionType === 'sale' ? 'sale' : 'rent',
    condition: s('condition') || 'תקין',
    description: s('description'),
  }
}

export function loadConversations(): EzraConversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (c): c is EzraConversation =>
          !!c &&
          typeof c === 'object' &&
          typeof (c as EzraConversation).id === 'string' &&
          typeof (c as EzraConversation).title === 'string' &&
          typeof (c as EzraConversation).createdAt === 'number' &&
          Array.isArray((c as EzraConversation).messages),
      )
      .map((c) => ({
        ...c,
        messages: c.messages.filter(
          (m): m is EzraMessage =>
            !!m &&
            typeof m === 'object' &&
            (m.role === 'user' || m.role === 'ezra') &&
            typeof m.text === 'string',
        ),
        draft: cleanDraft(c.draft),
        dirty: Array.isArray(c.dirty)
          ? c.dirty.filter((k): k is DraftKey => DRAFT_KEYS.includes(k as DraftKey))
          : [],
        publishedId: typeof c.publishedId === 'string' ? c.publishedId : undefined,
      }))
      .slice(0, MAX_CONVERSATIONS)
  } catch {
    return []
  }
}

export function saveConversations(list: EzraConversation[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_CONVERSATIONS)))
  } catch {
    // Storage full / private mode — the session keeps working in-memory.
  }
}

export function newConversationId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function titleFromText(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > 42 ? t.slice(0, 42).trimEnd() + '…' : t || 'שיחה חדשה'
}

// Simple bucketed Hebrew relative date — no date libraries.
export function relativeDate(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'עכשיו'
  if (min === 1) return 'לפני דקה'
  if (min < 60) return `לפני ${min} דקות`
  const hr = Math.floor(min / 60)
  if (hr === 1) return 'לפני שעה'
  if (hr === 2) return 'לפני שעתיים'
  if (hr < 24) return `לפני ${hr} שעות`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'אתמול'
  if (day === 2) return 'שלשום'
  if (day < 7) return `לפני ${day} ימים`
  const week = Math.floor(day / 7)
  if (week === 1) return 'לפני שבוע'
  if (week < 5) return `לפני ${week} שבועות`
  return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}
