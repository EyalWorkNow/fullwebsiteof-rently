// אתי page — conversation persistence (localStorage) + Hebrew relative dates.
// Account-scoped schema (key 'ati-conversations-[userId]'):

export interface AtiMessage {
  id?: string
  role: 'user' | 'ati'
  text: string
  listingIds?: string[]
  deep?: boolean
  interviewKey?: string
  why?: string
  chips?: string[]
  notes?: Record<string, string>
  explanations?: Record<string, string>
}

export function newMessageId(): string {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export interface AtiConversation {
  id: string
  title: string
  createdAt: number
  userId?: string
  messages: AtiMessage[]
}

const DEFAULT_KEY = 'ati-conversations'
const MAX_CONVERSATIONS = 50

function getKey(userId?: string | null): string {
  if (!userId) return `${DEFAULT_KEY}-guest`
  return `${DEFAULT_KEY}-${userId}`
}

export function loadConversations(userId?: string | null): AtiConversation[] {
  if (typeof window === 'undefined') return []
  const storageKey = getKey(userId)
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (c): c is AtiConversation =>
          !!c &&
          typeof c === 'object' &&
          typeof (c as AtiConversation).id === 'string' &&
          typeof (c as AtiConversation).title === 'string' &&
          typeof (c as AtiConversation).createdAt === 'number' &&
          Array.isArray((c as AtiConversation).messages),
      )
      .map((c) => ({
        ...c,
        messages: c.messages.filter(
          (m): m is AtiMessage =>
            !!m && typeof m === 'object' && (m.role === 'user' || m.role === 'ati') && typeof m.text === 'string',
        ),
      }))
      .slice(0, MAX_CONVERSATIONS)
  } catch {
    return []
  }
}

export function saveConversations(list: AtiConversation[], userId?: string | null): void {
  if (typeof window === 'undefined') return
  const storageKey = getKey(userId)
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(list.slice(0, MAX_CONVERSATIONS)))
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
