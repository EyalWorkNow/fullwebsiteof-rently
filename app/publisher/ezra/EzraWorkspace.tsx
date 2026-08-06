'use client'

// עזרא — the publisher's assistant workspace. Same anatomy as app/ati/AtiWorkspace.tsx
// (conversation sidebar, hero state, floating input bar, streaming reveal) but
// single-mode (no fast/personalized toggle — that's אתי's) and built around the
// live publishing draft instead of search results.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Add,
  Building,
  CloseCircle,
  Edit2,
  HambergerMenu,
  MagicStar,
  Messages3,
  Microphone2,
  SearchNormal1,
  Trash,
  VolumeHigh,
  VolumeSlash,
} from 'iconsax-react'
import { currentUser } from '@/lib/live/firebase'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import PropertyCard from '@/components/keyz/PropertyCard'
import type { ChatTurn, Property } from '@/lib/live/types'
import { fetchMyProperties } from '../portal-api'
import DraftCard from './DraftCard'
import SendButton from './SendButton'
import {
  EMPTY_DRAFT,
  ezraChat,
  fieldsFromExistingProperty,
  mergeDraft,
  photosFromExistingProperty,
  type DraftKey,
  type ExistingProperty,
} from './ezra-api'
import {
  loadConversations,
  newConversationId,
  newMessageId,
  relativeDate,
  saveConversations,
  titleFromText,
  type EzraConversation,
  type EzraMessage,
} from './store'

// ── Minimal Web Speech API typings (not in lib.dom for all TS configs) ───────
interface SpeechRecognitionResultLike {
  results: { [i: number]: { [j: number]: { transcript: string } } }
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecognitionResultLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function speakHebrew(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'he-IL'
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith('he'))
    if (voice) u.voice = voice
    window.speechSynthesis.speak(u)
  } catch {
    /* TTS is best-effort */
  }
}

const SEND_REASON = 'כדי שעזרא ישמור את הטיוטה של הדירה שלך'
const EDIT_REASON = 'כדי לערוך את הדירות שפרסמת'

const STARTER_CHIPS = [
  'יש לי דירת 3 חדרים בתל אביב',
  'אני משכיר דירה בגבעתיים מ-1 בספטמבר',
  'רוצה לפרסם דירה למכירה',
]

// Reveal budget matches the app's deliberate choice — a fixed ~0.4s regardless
// of reply length (12 steps × 32ms), not a per-word delay that scales with
// length and makes long replies feel slow.
const REVEAL_STEPS = 12
const REVEAL_STEP_MS = 32

function IridescentOrb() {
  return (
    <div className="relative flex items-center justify-center my-4">
      <div className="absolute h-36 w-36 rounded-full bg-gradient-to-r from-[#38B6FF]/30 via-[#0061FF]/20 to-[#38B6FF]/30 blur-2xl animate-pulse" />
      <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-sky-200 via-blue-100 to-sky-300 p-0.5 shadow-[0_10px_35px_rgba(0,97,255,0.25)] transition-transform duration-700 hover:scale-105">
        <div className="h-full w-full rounded-full bg-gradient-to-br from-white/90 via-sky-50/70 to-blue-100/90 backdrop-blur-md relative overflow-hidden flex items-center justify-center">
          <div className="absolute -top-3 -left-3 h-10 w-10 rounded-full bg-white/80 blur-sm" />
          <div className="absolute bottom-1 right-2 h-7 w-7 rounded-full bg-sky-300/40 blur-md" />
          <div className="absolute top-4 right-3 h-4 w-4 rounded-full bg-blue-300/30 blur-sm" />
          <MagicStar size={32} variant="Bold" color="currentColor" className="text-[#0061FF] drop-shadow-sm relative z-10" />
        </div>
      </div>
    </div>
  )
}

function EzraAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-navy-deep font-black text-white shadow-sm"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      ע
    </span>
  )
}

export default function EzraWorkspace({
  pendingEdit,
  onConsumePendingEdit,
}: {
  /** A property handed over from "הנכסים שלי" (its edit button) — auto-opens
   *  as an editing conversation as soon as this workspace mounts. */
  pendingEdit?: ExistingProperty | null
  onConsumePendingEdit?: () => void
} = {}) {
  const [conversations, setConversations] = useState<EzraConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(false)
  const [hasMic, setHasMic] = useState(false)
  const [revealMap, setRevealMap] = useState<Record<string, number>>({})

  // ── Edit an existing listing ────────────────────────────────────────────
  const [editPicker, setEditPicker] = useState<{
    open: boolean
    loading: boolean
    properties: ExistingProperty[] | null
    error: string | null
  }>({ open: false, loading: false, properties: null, error: null })

  const listingsMapRef = useRef<Map<string, Property>>(new Map())
  const [, setListingsVersion] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const speakRepliesRef = useRef(speakReplies)
  speakRepliesRef.current = speakReplies

  // ── Bootstrapping ──────────────────────────────────────────────────────────
  useEffect(() => {
    setConversations(loadConversations())
    setLoaded(true)
    setHasMic(!!getSpeechRecognition())
    return () => {
      recRef.current?.abort()
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    if (loaded) saveConversations(conversations)
  }, [conversations, loaded])

  const active = conversations.find((c) => c.id === activeId) ?? null

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [activeId, active?.messages.length, busy])

  // ── Streaming reveal ─────────────────────────────────────────────────────
  const startReveal = useCallback((id: string, text: string) => {
    const len = text.length
    if (len === 0) return
    setRevealMap((m) => ({ ...m, [id]: 0 }))
    let step = 0
    const tick = () => {
      step++
      setRevealMap((m) => ({ ...m, [id]: Math.ceil((step / REVEAL_STEPS) * len) }))
      if (step < REVEAL_STEPS) setTimeout(tick, REVEAL_STEP_MS)
    }
    setTimeout(tick, REVEAL_STEP_MS)
  }, [])

  const mergeListings = useCallback((items: Property[]) => {
    const map = listingsMapRef.current
    let changed = false
    for (const p of items) {
      if (p?.id && !map.has(p.id)) {
        map.set(p.id, p)
        changed = true
      }
    }
    if (changed) setListingsVersion((v) => v + 1)
  }, [])

  const resolveListings = (ids: string[] | undefined): Property[] =>
    (ids ?? []).map((id) => listingsMapRef.current.get(id)).filter((p): p is Property => !!p)

  // ── Conversation mutations ─────────────────────────────────────────────────
  const createConversation = useCallback((title: string): string => {
    const id = newConversationId()
    setConversations((prev) => [{ id, title, createdAt: Date.now(), messages: [] }, ...prev].slice(0, 50))
    setActiveId(id)
    return id
  }, [])

  async function openEditPicker() {
    const u = currentUser()
    if (!u || u.isAnonymous) return
    setEditPicker({ open: true, loading: true, properties: null, error: null })
    try {
      const props = await fetchMyProperties(u.uid)
      setEditPicker({ open: true, loading: false, properties: props as ExistingProperty[], error: null })
    } catch {
      setEditPicker({ open: true, loading: false, properties: null, error: 'לא הצלחנו לטעון את הנכסים שלך. נסו שוב.' })
    }
  }

  function startEditing(property: ExistingProperty) {
    setEditPicker({ open: false, loading: false, properties: null, error: null })
    const id = newConversationId()
    const draft = fieldsFromExistingProperty(property)
    const photos = photosFromExistingProperty(property)
    const msgId = newMessageId()
    const title = `עריכה: ${property.street || property.city || 'דירה'}`
    setConversations((prev) =>
      [
        {
          id,
          title,
          createdAt: Date.now(),
          messages: [
            {
              id: msgId,
              role: 'ezra' as const,
              text: `טוענת את הדירה ב${property.city || ''}${property.street ? `, ${property.street}` : ''} לעריכה — מה תרצו לשנות?`,
              draftHere: true,
            },
          ],
          draft,
          dirty: [],
          photos,
          editingProperty: property,
        },
        ...prev,
      ].slice(0, 50),
    )
    setActiveId(id)
  }

  useEffect(() => {
    if (pendingEdit) {
      startEditing(pendingEdit)
      onConsumePendingEdit?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEdit])

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setConfirmDeleteId(null)
    if (activeId === id) setActiveId(null)
  }

  const commitRename = () => {
    if (renameId) {
      const t = renameText.trim()
      if (t) setConversations((prev) => prev.map((c) => (c.id === renameId ? { ...c, title: t } : c)))
    }
    setRenameId(null)
    setRenameText('')
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || busy) return
      setInput('')

      const prior = conversations.find((c) => c.id === activeId)
      let convId = activeId
      if (!convId || !prior) {
        convId = createConversation(titleFromText(text))
      } else if (prior.messages.length === 0) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: titleFromText(text) } : c)),
        )
      }
      const priorMessages = prior?.messages ?? []
      const userMsg: EzraMessage = { id: newMessageId(), role: 'user', text }
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, userMsg] } : c)),
      )
      setBusy(true)

      try {
        const history: ChatTurn[] = [...priorMessages, userMsg]
          .filter((m) => m.text.trim())
          .slice(-12)
          .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }))
        const reply = await ezraChat(history)
        mergeListings(reply.listings)

        const replyId = newMessageId()
        const listingIds = reply.listings.map((p) => p.id).filter(Boolean)
        const draftHere = !!reply.propertyDraft

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c
            const nextDraft = reply.propertyDraft
              ? mergeDraft(c.draft ?? null, reply.propertyDraft, c.dirty ?? [])
              : c.draft
            const replyMsg: EzraMessage = {
              id: replyId,
              role: 'ezra',
              text: reply.reply,
              chips: reply.suggestions,
              listingIds: listingIds.length ? listingIds : undefined,
              draftHere,
            }
            return { ...c, draft: nextDraft, messages: [...c.messages, replyMsg] }
          }),
        )
        startReveal(replyId, reply.reply)
        if (speakRepliesRef.current && reply.reply) speakHebrew(reply.reply)
      } catch (e) {
        const errId = newMessageId()
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: errId,
                      role: 'ezra',
                      text: (e as Error).message || 'עזרא אינו זמין כרגע. נסו שוב.',
                      error: true,
                    },
                  ],
                }
              : c,
          ),
        )
      } finally {
        setBusy(false)
      }
    },
    [activeId, busy, conversations, createConversation, mergeListings, startReveal],
  )

  const { requireAuth } = useAuthGate()
  const sendRef = useRef(send)
  sendRef.current = send
  const guardedSend = useCallback(
    (raw: string) => {
      if (!raw.trim() || busy) return
      requireAuth(SEND_REASON, () => sendRef.current(raw))
    },
    [busy, requireAuth],
  )

  const onChipTap = useCallback((chip: string) => guardedSend(chip), [guardedSend])

  // ── Voice ────────────────────────────────────────────────────────────────
  function toggleMic() {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const Ctor = getSpeechRecognition()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'he-IL'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim() ?? ''
      if (transcript) {
        setInput(transcript)
        guardedSend(transcript)
      }
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  function guardedMic() {
    if (listening) {
      toggleMic()
      return
    }
    requireAuth(SEND_REASON, toggleMic)
  }

  // ── Draft editing ────────────────────────────────────────────────────────
  function handleDraftEdit(key: DraftKey, value: string) {
    if (!activeId) return
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c
        const draft = { ...(c.draft ?? EMPTY_DRAFT), [key]: value }
        const dirty = c.dirty?.includes(key) ? c.dirty : [...(c.dirty ?? []), key]
        return { ...c, draft, dirty }
      }),
    )
  }

  function handleDraftPublished(id: string) {
    if (!activeId) return
    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, publishedId: id } : c)))
  }

  function handlePhotosChange(photos: string[]) {
    if (!activeId) return
    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, photos } : c)))
  }

  // ── Sidebar data ─────────────────────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    if (!searchFilter.trim()) return conversations
    const q = searchFilter.trim().toLowerCase()
    return conversations.filter((c) => c.title.toLowerCase().includes(q))
  }, [conversations, searchFilter])

  const grouped = useMemo(() => {
    const today: EzraConversation[] = []
    const week: EzraConversation[] = []
    const older: EzraConversation[] = []
    const now = Date.now()
    const ONE_DAY = 24 * 60 * 60 * 1000
    for (const c of filteredConversations) {
      const diff = now - c.createdAt
      if (diff < ONE_DAY) today.push(c)
      else if (diff < 7 * ONE_DAY) week.push(c)
      else older.push(c)
    }
    return { today, week, older }
  }, [filteredConversations])

  function renderConversationItem(c: EzraConversation) {
    const isSelected = c.id === activeId
    return (
      <div
        key={c.id}
        className={`group relative mb-1 rounded-xl transition ${
          isSelected ? 'bg-primary-light2 font-bold text-primary' : 'text-navy hover:bg-cloud'
        }`}
      >
        {renameId === c.id ? (
          <div className="px-3 py-2">
            <input
              autoFocus
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') {
                  setRenameId(null)
                  setRenameText('')
                }
              }}
              onBlur={commitRename}
              className="w-full rounded-lg border border-primary/40 bg-white px-2 py-1 text-[12.5px] font-medium text-navy outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveId(c.id)
              setSidebarOpen(false)
              setConfirmDeleteId(null)
            }}
            className="block w-full px-3 py-2 text-start"
          >
            <span className="block truncate pe-12 text-[12.5px] leading-relaxed">{c.title}</span>
            <span className="block truncate pe-12 text-[10.5px] font-normal text-secondary-text">
              {relativeDate(c.createdAt)}
            </span>
          </button>
        )}

        {confirmDeleteId === c.id ? (
          <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-border-app bg-white px-2 py-0.5 shadow-sm">
            <span className="text-[11px] font-semibold text-navy">למחוק?</span>
            <button
              type="button"
              onClick={() => deleteConversation(c.id)}
              className="text-[11px] font-bold text-coral hover:underline"
            >
              כן
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="text-[11px] font-bold text-secondary-text hover:underline"
            >
              לא
            </button>
          </div>
        ) : (
          renameId !== c.id && (
            <div className="absolute end-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 group-hover:flex">
              <button
                type="button"
                aria-label="שינוי שם"
                onClick={() => {
                  setRenameId(c.id)
                  setRenameText(c.title)
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-secondary-text shadow-sm transition hover:text-primary"
              >
                <Edit2 size={12} color="currentColor" />
              </button>
              <button
                type="button"
                aria-label="מחיקת שיחה"
                onClick={() => setConfirmDeleteId(c.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-secondary-text shadow-sm transition hover:text-coral"
              >
                <Trash size={12} color="currentColor" />
              </button>
            </div>
          )
        )}
      </div>
    )
  }

  const sidebarContent = (
    <div
      className={`relative flex h-[calc(100vh-80px)] flex-col overflow-hidden rounded-3xl border border-border-app bg-white/95 shadow-lg backdrop-blur-xl transition-all duration-300 ${
        isSidebarCollapsed ? 'w-[72px]' : 'w-[270px]'
      }`}
    >
      <div className="flex items-center justify-between border-b border-border-app p-3.5">
        {!isSidebarCollapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <EzraAvatar size={36} />
            <div className="min-w-0">
              <span className="block truncate text-[15px] font-black leading-tight text-navy">Rently</span>
              <span className="block truncate text-[11px] font-bold text-navy-deep">עזרא · עוזר הפרסום</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <EzraAvatar size={36} />
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          aria-label={isSidebarCollapsed ? 'הרחב סרגל צד' : 'כווץ סרגל צד'}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cloud text-secondary-text transition hover:bg-primary-light2 hover:text-primary lg:flex"
        >
          <HambergerMenu size={16} color="currentColor" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <button
          type="button"
          onClick={() => {
            createConversation('שיחה חדשה')
            setSidebarOpen(false)
          }}
          className={`flex items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white shadow-md transition hover:bg-primary-dark ${
            isSidebarCollapsed ? 'mx-auto h-10 w-10' : 'w-full px-4 py-2.5 text-[13.5px]'
          }`}
          title="שיחה חדשה"
        >
          <Add size={isSidebarCollapsed ? 20 : 18} color="currentColor" />
          {!isSidebarCollapsed && <span>שיחה חדשה</span>}
        </button>
        <button
          type="button"
          onClick={() => requireAuth(EDIT_REASON, openEditPicker)}
          className={`flex items-center justify-center gap-2 rounded-2xl border border-border-app bg-white font-bold text-navy shadow-sm transition hover:bg-cloud ${
            isSidebarCollapsed ? 'mx-auto h-10 w-10' : 'w-full px-4 py-2.5 text-[13.5px]'
          }`}
          title="עריכת דירה קיימת"
        >
          <Building size={isSidebarCollapsed ? 20 : 18} color="currentColor" />
          {!isSidebarCollapsed && <span>עריכת דירה קיימת</span>}
        </button>
      </div>

      {!isSidebarCollapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-center rounded-xl border border-border-app bg-cloud px-3 py-1.5 transition focus-within:border-primary focus-within:bg-white">
            <SearchNormal1 size={15} color="currentColor" className="me-2 shrink-0 text-secondary-text" />
            <input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="חפש בשיחות…"
              className="w-full bg-transparent text-[12.5px] text-navy outline-none placeholder:text-secondary-text"
            />
          </div>
        </div>
      )}

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-2">
        {!isSidebarCollapsed ? (
          filteredConversations.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] font-medium text-secondary-text">
              אין שיחות עדיין
            </p>
          ) : (
            <>
              {grouped.today.length > 0 && (
                <div>
                  <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-secondary-text">
                    היום
                  </p>
                  {grouped.today.map(renderConversationItem)}
                </div>
              )}
              {grouped.week.length > 0 && (
                <div>
                  <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-secondary-text">
                    7 הימים האחרונים
                  </p>
                  {grouped.week.map(renderConversationItem)}
                </div>
              )}
              {grouped.older.length > 0 && (
                <div>
                  <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-secondary-text">
                    ישן יותר
                  </p>
                  {grouped.older.map(renderConversationItem)}
                </div>
              )}
            </>
          )
        ) : (
          <div className="flex flex-col items-center gap-2 pt-1">
            {filteredConversations.slice(0, 6).map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.title}
                onClick={() => setActiveId(c.id)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition ${
                  c.id === activeId
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-cloud text-secondary-text hover:bg-primary-light2 hover:text-primary'
                }`}
              >
                {c.title.charAt(0) || 'ש'}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isSidebarCollapsed && (
        <div className="border-t border-border-app bg-cloud/60 p-3 text-center">
          <p className="text-[11px] font-semibold text-secondary-text">
            עזרא זוכר את כל הטיוטות שלך — אפשר לחזור אליהן בכל שיחה
          </p>
        </div>
      )}
    </div>
  )

  const showHeroState = !active || active.messages.length === 0

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#F8FAFC]">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary-light2/70 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[450px] w-[450px] rounded-full bg-navy-deep/5 blur-3xl" />

      <aside className="z-20 m-3.5 hidden shrink-0 lg:block">{sidebarContent}</aside>

      <section className="relative z-10 flex h-full min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border-app bg-white/60 p-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            aria-label="תפריט שיחות"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-app bg-white text-navy shadow-sm hover:text-primary"
          >
            <HambergerMenu size={18} color="currentColor" />
          </button>
          <span className="text-[14px] font-black text-navy">עזרא — עוזר הפרסום</span>
        </div>

        <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-2 sm:px-4 md:px-8 py-2 md:py-4 h-full">
          {showHeroState ? (
            /* Welcome Hero View — top greeting + bottom chatbox on mobile */
            <div className="flex h-full flex-col justify-between items-center max-w-[760px] mx-auto text-center pt-2 pb-2 md:pt-12 md:pb-4 min-h-0">
              <div className="flex flex-col items-center my-auto md:my-0 py-2 shrink-0">
                <IridescentOrb />

                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                  שלום, כיצד אוכל{' '}
                  <span className="bg-gradient-to-r from-[#0061FF] via-[#38B6FF] to-blue-600 bg-clip-text text-transparent">
                    לעזור לך לפרסם?
                  </span>
                </h1>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500 max-w-[480px]">
                  ספרו על הדירה ועזרא יבנה את המודעה ויכין אותה לפרסום
                </p>
                <p className="mt-2 hidden sm:block max-w-[560px] text-[12px] font-semibold leading-relaxed text-slate-500">
                  כדי שהמודעה תהיה מדויקת ומושכת כבר מההתחלה, כדאי לכלול בהודעה הראשונה כמה שיותר
                  פרטים: <span className="text-slate-700">עיר ורחוב, מספר חדרים, גודל במ״ר, קומה,
                  מחיר, סוג עסקה, מצב הנכס ותיאור קצר</span>.
                </p>
              </div>

              <div className="w-full max-w-[680px] mt-auto shrink-0 pb-1 md:pb-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    guardedSend(input)
                  }}
                  className="relative rounded-2xl md:rounded-3xl border border-white/90 bg-white/95 p-3 md:p-4 shadow-[0_15px_40px_rgba(0,97,255,0.08)] backdrop-blur-xl transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
                >
                  <div className="flex items-start gap-2 sm:gap-2.5">
                    <MagicStar size={20} variant="Bold" color="currentColor" className="text-[#0061FF] shrink-0 mt-1.5" />
                    <textarea
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          guardedSend(input)
                        }
                      }}
                      rows={1}
                      placeholder="ספרו על הדירה… (למשל: יש לי דירת 3 חדרים בתל אביב עם מרפסת)"
                      className="w-full resize-none bg-transparent text-[13.5px] sm:text-[14.5px] font-medium text-slate-800 outline-none placeholder:text-slate-400 leading-relaxed min-h-[40px] max-h-[180px] overflow-y-auto transition-all"
                    />
                  </div>

                  <div className="mt-3 md:mt-4 flex items-center justify-end border-t border-slate-100/90 pt-2.5 md:pt-3">
                    <SendButton disabled={!input.trim()} onClick={() => guardedSend(input)} />
                  </div>
                </form>

                <div className="mt-2.5 md:mt-4 flex flex-wrap justify-center gap-1.5 sm:gap-2">
                  {STARTER_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => guardedSend(chip)}
                      className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-[11.5px] sm:text-[12.5px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm transition hover:border-blue-400 hover:bg-white hover:text-[#0061FF]"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[800px] space-y-6 pb-24">
              {active.messages.map((m, i) => {
                const listings = resolveListings(m.listingIds)
                const shownText =
                  m.id && revealMap[m.id] !== undefined ? m.text.slice(0, revealMap[m.id]) : m.text
                const showDraftHere = m.draftHere && active.draft
                return (
                  <div key={m.id ?? i} className="flex flex-col">
                    {m.role === 'user' ? (
                      <div className="max-w-[82%] self-end rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-[14.5px] font-medium leading-relaxed text-white shadow-md">
                        {m.text}
                      </div>
                    ) : (
                      <div className="flex max-w-full items-start gap-3 self-start">
                        <EzraAvatar size={36} />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`max-w-[620px] whitespace-pre-line rounded-2xl rounded-bl-sm border px-4 py-3 text-[14.5px] font-medium leading-relaxed shadow-sm ${
                              m.error
                                ? 'border-coral/30 bg-[#FFF2F2] text-coral'
                                : 'border-border-app bg-white text-navy'
                            }`}
                          >
                            {shownText}
                          </div>
                        </div>
                      </div>
                    )}

                    {listings.length > 0 && (
                      <div className="no-scrollbar mt-3 flex snap-x gap-4 overflow-x-auto pb-2 ps-11">
                        {listings.map((p) => (
                          <div key={p.id} className="shrink-0 snap-start">
                            <a href={`/listing/${p.id}`} className="block">
                              <PropertyCard property={p} />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.role === 'ezra' && (m.chips?.length ?? 0) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 ps-11">
                        {m.chips!.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => onChipTap(chip)}
                            className="cursor-pointer rounded-full border border-border-app bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-navy shadow-sm transition hover:border-primary hover:text-primary"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}

                    {showDraftHere && (
                      <DraftCard
                        fields={active.draft!}
                        dirty={active.dirty ?? []}
                        photos={(active as EzraConversation).photos ?? []}
                        onPhotosChange={handlePhotosChange}
                        publishedId={active.publishedId}
                        onEdit={handleDraftEdit}
                        onPublished={handleDraftPublished}
                        isEditing={!!active.editingProperty}
                        existing={active.editingProperty}
                      />
                    )}
                  </div>
                )
              })}

              {busy && (
                <div className="flex items-center gap-2.5 self-start ps-1">
                  <EzraAvatar size={28} />
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border-app bg-white px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-2 w-2 animate-bounce rounded-full bg-secondary-text/50"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!showHeroState && (
          <div className="absolute inset-x-4 bottom-4 z-30 md:inset-x-8">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                guardedSend(input)
              }}
              className="mx-auto flex max-w-[800px] items-center gap-1 rounded-2xl border border-white/95 bg-white/95 p-2 ps-4 shadow-[0_15px_35px_rgba(6,36,58,0.09)] backdrop-blur-xl"
            >
              <button
                type="button"
                onClick={() => setSpeakReplies((v) => !v)}
                title={speakReplies ? 'הקראת תשובות: פועל' : 'הקראת תשובות: כבוי'}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                  speakReplies ? 'bg-primary-light2 text-primary' : 'text-secondary-text hover:bg-cloud'
                }`}
              >
                {speakReplies ? (
                  <VolumeHigh size={19} variant="Bold" color="currentColor" />
                ) : (
                  <VolumeSlash size={19} variant="Linear" color="currentColor" />
                )}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? 'מקשיבה…' : 'הקלד הודעה לעזרא…'}
                className="min-w-0 flex-1 bg-transparent text-[14.5px] font-medium text-navy outline-none placeholder:text-secondary-text"
              />
              {hasMic && (
                <button
                  type="button"
                  onClick={guardedMic}
                  title="דיבור"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                    listening ? 'animate-pulse bg-coral text-white' : 'text-secondary-text hover:bg-cloud'
                  }`}
                >
                  <Microphone2 size={19} variant={listening ? 'Bold' : 'Linear'} color="currentColor" />
                </button>
              )}
              <SendButton disabled={!input.trim()} onClick={() => guardedSend(input)} />
            </form>
            {listening && (
              <p className="mt-2 animate-pulse text-center text-xs font-bold text-coral">מקשיבה…</p>
            )}
          </div>
        )}
      </section>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 end-0 flex max-w-[85vw] p-2 shadow-2xl">{sidebarContent}</div>
        </div>
      )}

      {editPicker.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            onClick={() => setEditPicker({ open: false, loading: false, properties: null, error: null })}
            aria-hidden
          />
          <div className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-black text-navy">בחר דירה לעריכה</h2>
              <button
                type="button"
                onClick={() => setEditPicker({ open: false, loading: false, properties: null, error: null })}
                className="text-secondary-text transition hover:text-navy"
                aria-label="סגור"
              >
                <CloseCircle size={22} color="currentColor" />
              </button>
            </div>

            {editPicker.loading && (
              <p className="py-8 text-center text-[13px] font-bold text-secondary-text">טוען את הדירות שלך…</p>
            )}
            {editPicker.error && (
              <p className="py-8 text-center text-[13px] font-bold text-coral">{editPicker.error}</p>
            )}
            {!editPicker.loading && !editPicker.error && editPicker.properties?.length === 0 && (
              <p className="py-8 text-center text-[13px] font-bold text-secondary-text">
                עדיין לא פרסמת אף דירה.
              </p>
            )}
            {!editPicker.loading && (editPicker.properties?.length ?? 0) > 0 && (
              <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto">
                {editPicker.properties!.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => startEditing(p)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border-app bg-white p-2.5 text-start transition hover:border-primary hover:bg-primary-light2"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-cloud text-secondary-text">
                      <Building size={20} color="currentColor" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-navy">
                        {p.city as string}
                        {p.street ? `, ${p.street as string}` : ''}
                      </p>
                      <p className="truncate text-[11.5px] font-bold text-secondary-text">
                        {p.rooms ? `${p.rooms as string | number} חדרים · ` : ''}
                        {p.price ? `₪${p.price as string | number}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
