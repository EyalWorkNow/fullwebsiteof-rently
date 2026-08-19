// Decodes the app's in-text chat markers so web renders the same rich
// messages instead of raw strings. Wire formats (see the app's
// lib/core/chat/chat_media.dart and slot_message.dart — the app is the
// contract, do not change these shapes):
//   image    → `[[MEDIA:image]]<url>`         (app emits "[[MEDIA: image]]", space tolerated)
//   audio    → `[[MEDIA:audio:<durationMs>]]<url>`
//   proposal → `<hebrew line>\n[[SLOTS:<json>]]`
//   confirm  → `<hebrew line>\n[[SLOT_CONFIRM:<json>]]`

export interface ChatMedia {
  kind: 'image' | 'audio'
  url: string
  durationMs?: number
}

const MEDIA_RE = /^\[\[MEDIA:\s*(image|audio)(?::\s*(\d+))?\]\]([\s\S]+)$/

export function parseMedia(text: string): ChatMedia | null {
  const m = MEDIA_RE.exec(text.trim())
  if (!m) return null
  const url = m[3].trim()
  if (!url) return null
  return {
    kind: m[1] as 'image' | 'audio',
    url,
    ...(m[2] ? { durationMs: Number(m[2]) } : {}),
  }
}

export interface SlotOption {
  slotId: string
  start: string // ISO, app-local time (Dart toIso8601String, no offset)
  durationMinutes: number
}

export interface SlotMessage {
  kind: 'proposal' | 'confirm'
  human: string
  propertyId: string
  options: SlotOption[]
}

function markerPayload(text: string, open: string): { human: string; json: string } | null {
  const i = text.indexOf(open)
  if (i < 0) return null
  const end = text.lastIndexOf(']]')
  if (end <= i) return null
  return { human: text.slice(0, i).trim(), json: text.slice(i + open.length, end) }
}

export function parseSlots(text: string): SlotMessage | null {
  for (const [open, kind] of [
    ['[[SLOTS:', 'proposal'],
    ['[[SLOT_CONFIRM:', 'confirm'],
  ] as const) {
    const hit = markerPayload(text, open)
    if (!hit) continue
    try {
      const data = JSON.parse(hit.json)
      const raw = kind === 'proposal' ? data?.options : [data]
      const options: SlotOption[] = (Array.isArray(raw) ? raw : [])
        .filter((o) => o && o.start)
        .map((o) => ({
          slotId: String(o.slotId ?? ''),
          start: String(o.start),
          durationMinutes: Number(o.durationMinutes) || 30,
        }))
      if (!options.length) return null
      return { kind, human: hit.human, propertyId: String(data?.propertyId ?? ''), options }
    } catch {
      return null
    }
  }
  return null
}

/** Byte-for-byte the app's SlotMessageCodec.encodeConfirm, so the app's chat
 *  and the landlord calendar recognize a web-side confirmation. */
export function encodeSlotConfirm(opt: SlotOption, propertyId: string): string {
  const payload = JSON.stringify({
    slotId: opt.slotId,
    start: opt.start,
    durationMinutes: opt.durationMinutes,
    propertyId,
  })
  return `אישרתי מועד לצפייה בדירה ✓\n[[SLOT_CONFIRM:${payload}]]`
}

export function formatSlot(opt: SlotOption): string {
  const d = new Date(opt.start)
  if (isNaN(d.getTime())) return opt.start
  const day = d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time} (${opt.durationMinutes} דק׳)`
}

export function formatVoiceDuration(ms?: number): string {
  if (!ms || ms <= 0) return 'הודעה קולית'
  const s = Math.round(ms / 1000)
  return `הודעה קולית · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
