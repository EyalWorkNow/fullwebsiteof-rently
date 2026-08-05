'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Add, CloseCircle, Edit2, HambergerMenu, MagicStar, Send2, Trash } from 'iconsax-react'
import { fetchProperties, type PropertiesResult } from '@/lib/live/api'
import { buildReply, parseQuery, rankProperties } from '@/lib/live/smart-search'
import type { ChatTurn, Property } from '@/lib/live/types'
import PropertyCard from '@/components/keyz/PropertyCard'
import { deepAssistantSearch } from './assistant'
import {
  loadConversations,
  newConversationId,
  relativeDate,
  saveConversations,
  titleFromText,
  type AtiConversation,
  type AtiMessage,
} from './store'

// One property fetch per page load, shared with every send (same pattern as Hero).
let propertiesPromise: Promise<PropertiesResult> | null = null
function ensureProperties(): Promise<PropertiesResult> {
  propertiesPromise ??= fetchProperties(500)
  return propertiesPromise
}

const CHIPS = [
  'דירת 3 חדרים עם מרפסת בתל אביב',
  'עד 6,500 ₪ ליד רכבת קלה',
  'דירה שקטה ליד פארק',
  '4 חדרים מרוהטת בגבעתיים',
]

function AtiAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-primary-light2"
      style={{ width: size, height: size }}
    >
      <MagicStar size={Math.round(size * 0.55)} variant="Bold" color="currentColor" className="text-primary" />
    </span>
  )
}

export default function AtiWorkspace() {
  const [conversations, setConversations] = useState<AtiConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deepBusyConvId, setDeepBusyConvId] = useState<string | null>(null)

  // id → Property cache for resolving message listingIds into cards.
  const propsMapRef = useRef<Map<string, Property>>(new Map())
  const [, setPropsVersion] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Bootstrapping ──────────────────────────────────────────────────────────
  useEffect(() => {
    setConversations(loadConversations())
    setLoaded(true)
    // Warm the property cache so the first send is instant and old
    // conversations can resolve their listingIds into cards.
    ensureProperties().then(({ items }) => {
      const map = propsMapRef.current
      for (const p of items) if (p?.id && !map.has(p.id)) map.set(p.id, p)
      setPropsVersion((v) => v + 1)
    })
  }, [])

  useEffect(() => {
    if (loaded) saveConversations(conversations)
  }, [conversations, loaded])

  const active = conversations.find((c) => c.id === activeId) ?? null

  // Auto-scroll to the newest message.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [activeId, active?.messages.length, deepBusyConvId])

  // ── Conversation mutations ─────────────────────────────────────────────────
  const mergeProps = useCallback((items: Property[]) => {
    const map = propsMapRef.current
    for (const p of items) if (p?.id) map.set(p.id, p)
    setPropsVersion((v) => v + 1)
  }, [])

  const appendMessage = useCallback((convId: string, msg: AtiMessage) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, msg] } : c)),
    )
  }, [])

  const createConversation = useCallback((title: string): string => {
    const id = newConversationId()
    setConversations((prev) => [{ id, title, createdAt: Date.now(), messages: [] }, ...prev].slice(0, 50))
    setActiveId(id)
    return id
  }, [])

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setConfirmDeleteId(null)
    if (activeId === id) setActiveId(null)
  }

  const commitRename = () => {
    if (renameId) {
      const t = renameText.trim()
      if (t) {
        setConversations((prev) => prev.map((c) => (c.id === renameId ? { ...c, title: t } : c)))
      }
    }
    setRenameId(null)
    setRenameText('')
  }

  // ── Engine: instant local answer + background backend deepening ───────────
  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text) return
      setInput('')

      // Snapshot prior turns BEFORE appending (for the backend history).
      const prior = conversations.find((c) => c.id === activeId)
      let convId = activeId
      if (!convId || !prior) {
        convId = createConversation(titleFromText(text))
      } else if (prior.messages.length === 0) {
        // First message names the conversation.
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: titleFromText(text) } : c)),
        )
      }
      appendMessage(convId, { role: 'user', text })

      // (a) LOCAL engine — instant.
      const { items } = await ensureProperties()
      const parsed = parseQuery(text)
      const ranked = rankProperties(parsed, items, 8)
      const localReply = buildReply(parsed, ranked)
      mergeProps(
        ranked.map((r) => ({ ...r.property, smartTags: [...r.tags, ...(r.property.smartTags ?? [])] })),
      )
      appendMessage(convId, {
        role: 'ati',
        text: localReply,
        listingIds: ranked.length ? ranked.map((r) => r.property.id) : undefined,
      })

      // (b) BACKEND — the real conversational brain, in the background.
      const turns: ChatTurn[] = [...(prior?.messages ?? []), { role: 'user' as const, text }]
        .slice(-10)
        .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), text: m.text }))
      setDeepBusyConvId(convId)
      deepAssistantSearch(turns)
        .then((res) => {
          if (!res || res.reply === localReply) return
          if (res.listings.length) mergeProps(res.listings)
          appendMessage(convId!, {
            role: 'ati',
            text: res.reply,
            listingIds: res.listings.length ? res.listings.map((p) => p.id) : undefined,
            deep: true,
          })
        })
        .finally(() => setDeepBusyConvId((cur) => (cur === convId ? null : cur)))
    },
    [activeId, conversations, appendMessage, createConversation, mergeProps],
  )

  const resolveListings = (ids: string[]): Property[] =>
    ids.map((id) => propsMapRef.current.get(id)).filter((p): p is Property => !!p)

  const showChips = !active || active.messages.length === 0

  // ── Sidebar (shared between desktop pane and mobile slide-over) ───────────
  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="p-4 pb-2">
        <button
          type="button"
          onClick={() => {
            createConversation('שיחה חדשה')
            setSidebarOpen(false)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[14px] font-bold text-white transition hover:bg-primary-dark"
        >
          <Add size={18} color="currentColor" />
          שיחה חדשה
        </button>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto p-2">
        {conversations.length === 0 && (
          <p className="px-3 py-4 text-center text-[13px] font-semibold text-secondary-text">
            אין עדיין שיחות — התחילו אחת חדשה
          </p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group relative mb-1 rounded-2xl transition ${
              c.id === activeId ? 'bg-primary-light2' : 'hover:bg-cloud'
            }`}
          >
            {renameId === c.id ? (
              <div className="px-3 py-2.5">
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
                  className="w-full rounded-lg border border-border-app bg-white px-2 py-1 text-[13.5px] font-semibold text-navy outline-none focus:border-primary"
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
                className="block w-full px-3 py-2.5 text-start"
              >
                <span className="block truncate pe-12 text-[13.5px] font-bold text-navy">{c.title}</span>
                <span className="mt-0.5 block text-[11.5px] font-semibold text-secondary-text">
                  {relativeDate(c.createdAt)}
                </span>
              </button>
            )}

            {confirmDeleteId === c.id ? (
              <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-white px-2 py-1 badge-shadow">
                <span className="text-[11.5px] font-bold text-navy">למחוק?</span>
                <button
                  type="button"
                  onClick={() => deleteConversation(c.id)}
                  className="text-[11.5px] font-black hover:underline"
                  style={{ color: '#FF5A67' }}
                >
                  כן
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-[11.5px] font-black text-secondary-text hover:underline"
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
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-secondary-text badge-shadow transition hover:text-primary"
                  >
                    <Edit2 size={14} color="currentColor" />
                  </button>
                  <button
                    type="button"
                    aria-label="מחיקת שיחה"
                    onClick={() => setConfirmDeleteId(c.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-secondary-text badge-shadow transition hover:text-[#FF5A67]"
                  >
                    <Trash size={14} color="currentColor" />
                  </button>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex h-full w-full max-w-[1200px] px-4 pb-4">
      {/* Chat column */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Header row */}
        <div className="flex items-center gap-3 border-b border-border-app pb-3">
          <AtiAvatar size={40} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-black text-navy">אתי — העוזרת האישית</h1>
            <p className="text-[12.5px] font-semibold text-secondary-text">חיפוש דירות בשפה חופשית</p>
          </div>
          <button
            type="button"
            aria-label="רשימת שיחות"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-app bg-white text-navy transition hover:border-primary hover:text-primary lg:hidden"
          >
            <HambergerMenu size={20} color="currentColor" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto py-4">
          {!active || active.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-light2">
                <MagicStar size={44} variant="Bold" color="currentColor" className="text-primary" />
              </span>
              <div>
                <p className="text-[18px] font-black text-navy">התחילו שיחה חדשה</p>
                <p className="mt-1 max-w-[360px] text-[14px] font-semibold text-secondary-text">
                  ספרו לאתי מה חשוב לכם — עיר, תקציב, חדרים — והיא תמצא דירות אמיתיות מהמאגר
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {active.messages.map((m, i) => {
                const listings = m.listingIds?.length ? resolveListings(m.listingIds) : []
                return (
                  <div key={i} className="flex flex-col">
                    {m.role === 'user' ? (
                      <div className="max-w-[78%] self-end rounded-2xl rounded-br-md bg-primary-light2 px-4 py-2.5 text-[14.5px] font-semibold leading-relaxed text-navy">
                        {m.text}
                      </div>
                    ) : (
                      <div className="flex max-w-full items-start gap-2.5 self-start">
                        <AtiAvatar />
                        <div className="min-w-0">
                          {m.deep && (
                            <p className="mb-1 text-[11px] font-black text-primary">מעמיקה 🔍</p>
                          )}
                          <div className="max-w-[560px] whitespace-pre-line rounded-2xl rounded-bl-md bg-cloud px-4 py-2.5 text-[14.5px] font-semibold leading-relaxed text-navy">
                            {m.text}
                          </div>
                        </div>
                      </div>
                    )}
                    {listings.length > 0 && (
                      <div className="no-scrollbar mt-3 flex snap-x gap-4 overflow-x-auto pb-2">
                        {listings.map((p) => (
                          <a key={p.id} href={`/listing/${p.id}`} className="block snap-start">
                            <PropertyCard property={p} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {deepBusyConvId === active.id && (
                <div className="flex items-center gap-2.5 self-start">
                  <AtiAvatar />
                  <span className="animate-pulse text-[12.5px] font-bold text-secondary-text">
                    אתי מעמיקה בחיפוש… 🔍
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suggestion chips (empty conversation only) */}
        {showChips && (
          <div className="mb-3 flex flex-wrap justify-center gap-2.5">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => send(chip)}
                className="cursor-pointer rounded-full border border-border-app bg-white px-4 py-2 text-[13px] font-semibold text-navy transition hover:border-primary hover:text-primary"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="card-shadow sticky bottom-0 flex items-center gap-3 rounded-full border border-border-app bg-white p-2 ps-5"
        >
          <MagicStar size={20} variant="Bold" color="currentColor" className="shrink-0 text-primary" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="למשל: דירת 3 חדרים עם מרפסת בתל אביב עד 8,000 ₪"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-[#9EB5C8]"
          />
          <button
            type="submit"
            aria-label="שליחה"
            disabled={!input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-dark disabled:opacity-50"
          >
            <Send2 size={20} color="currentColor" className="-scale-x-100" />
          </button>
        </form>
      </section>

      {/* Conversation sidebar — desktop pane (end side) */}
      <aside className="ms-4 hidden w-[280px] shrink-0 border-s border-border-app lg:block">
        {sidebarBody}
      </aside>

      {/* Mobile slide-over */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 end-0 flex w-[300px] max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-app px-4 py-3">
              <span className="text-[15px] font-black text-navy">השיחות שלי</span>
              <button
                type="button"
                aria-label="סגירה"
                onClick={() => setSidebarOpen(false)}
                className="text-secondary-text transition hover:text-navy"
              >
                <CloseCircle size={22} color="currentColor" />
              </button>
            </div>
            <div className="min-h-0 flex-1">{sidebarBody}</div>
          </div>
        </div>
      )}
    </div>
  )
}
