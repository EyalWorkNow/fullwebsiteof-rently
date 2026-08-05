// אתי page — conversation persistence (localStorage) + Hebrew relative dates.
// Schema (key 'ati-conversations'):
//   [{ id, title, createdAt, messages: [{ role: 'user'|'ati', text, listingIds?, deep? }] }]

export interface AtiMessage {
  role: 'user' | 'ati'
  text: string
  /** Property ids to render as an inline card carousel (resolved at render time). */
  listingIds?: string[]
  /** true = the backend "מעמיקה" follow-up (vs. the instant local engine). */
  deep?: boolean
}

export interface AtiConversation {
  id: string
  title: string
  createdAt: number
  messages: AtiMessage[]
}

const KEY = 'ati-conversations'
const MAX_CONVERSATIONS = 50

export function loadConversations(): AtiConversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
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

export function saveConversations(list: AtiConversation[]): void {
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
