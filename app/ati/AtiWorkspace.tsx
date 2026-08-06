'use client'

// אתי on the web — the SAME two modes and the same brain as the app's
// SearchChatScreen (search_chat_screen.dart):
//
//   ⚡ מהיר (immediate)        — purely on-device. parse → rank → reply, instantly.
//   🎯 מותאם אישית (default)   — a short guided interview (≤3 adaptive questions,
//                               each with its "why"), then progressive rendering:
//                               instant local results FIRST, then a background
//                               upgrade (enrich → backend cohort rank → lifestyle
//                               filter/rank → verification gate → warm reply →
//                               per-result explanations) swapped in quietly.
//
// Progressive rendering is ALWAYS on. Every network step is fail-soft — a failing
// step must never blank the results already on screen.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Add,
  CloseCircle,
  Edit2,
  Flash,
  HambergerMenu,
  MagicStar,
  Magicpen,
  Send2,
  Trash,
} from 'iconsax-react'
import { fetchProperties, type PropertiesResult } from '@/lib/live/api'
import {
  buildReply,
  queryIsEmpty,
  rankByLifestyle,
  type ParsedQuery,
  type ScoredWebProperty,
} from '@/lib/live/smart-search'
import {
  INTERVIEW_INTRO,
  MAX_INTERVIEW_QUESTIONS,
  REFINE_NO,
  REFINE_YES,
  SKIP_CHIP,
  applyLifestyle,
  applyLifestyleFilter,
  clarifyingPrompt,
  cohortRanked,
  conversationQuery,
  ettiEnrich,
  fetchExplanations,
  howIChoseFallback,
  instantReply,
  loadImmediateMode,
  localAck,
  localReply,
  localSearch,
  lifestyleNote,
  nearbySameFilters,
  nextInterviewQuestion,
  personaFrom,
  queryIsRich,
  refineChips,
  refinePromptChips,
  saveImmediateMode,
  serverReply,
  verifyResults,
  warmFallback,
  wantsResultsNow,
  type Persona,
} from '@/lib/live/personalize'
import type { ChatTurn, Property } from '@/lib/live/types'
import PropertyCard from '@/components/keyz/PropertyCard'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import {
  loadConversations,
  newConversationId,
  newMessageId,
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

const LIFESTYLE_NOTE_PREFIX = 'שמתי לב לכמה דברים:'

// Registration is asked for only when the visitor tries to SEND a message.
const SEND_REASON = 'כדי שאתי תזכור את השיחה ותמשיך אותה בפעם הבאה'

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

/** Web port of SpeedModeSlider — two pills, מותאם אישית then מהיר (same order). */
function SpeedModeToggle({
  immediate,
  onChange,
}: {
  immediate: boolean
  onChange: (v: boolean) => void
}) {
  const seg = (selected: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[13px] transition ${
      selected
        ? 'bg-primary font-black text-white shadow-sm'
        : 'font-bold text-secondary-text hover:text-navy'
    }`
  return (
    <div
      role="group"
      aria-label="מצב חיפוש"
      className="flex w-[260px] max-w-full items-center gap-1 rounded-full border border-border-app bg-cloud p-1"
    >
      <button type="button" onClick={() => onChange(false)} className={seg(!immediate)} aria-pressed={!immediate}>
        <Magicpen size={15} variant="Bold" color="currentColor" />
        מותאם אישית
      </button>
      <button type="button" onClick={() => onChange(true)} className={seg(immediate)} aria-pressed={immediate}>
        <Flash size={15} variant="Bold" color="currentColor" />
        מהיר
      </button>
    </div>
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
  // Speed mode — global (the app shares it between chat and voice), persisted.
  const [immediate, setImmediate] = useState(false)

  // id → Property cache for resolving message listingIds into cards.
  const propsMapRef = useRef<Map<string, Property>>(new Map())
  const [, setPropsVersion] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Rotating indices for the local reply openers / warm fallback lines.
  const openerIdxRef = useRef(0)

  // ── Bootstrapping ──────────────────────────────────────────────────────────
  useEffect(() => {
    setConversations(loadConversations())
    setImmediate(loadImmediateMode())
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

  // Auto-scroll to the newest message. The background upgrade swaps bubbles in
  // place (no new messages), so it never causes a scroll jump.
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

  const appendMessages = useCallback((convId: string, msgs: AtiMessage[]) => {
    if (msgs.length === 0) return
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, ...msgs] } : c)),
    )
  }, [])

  /** In-place bubble update — the quiet swap the app's _upgradeSearch performs. */
  const patchMessage = useCallback((convId: string, msgId: string, patch: Partial<AtiMessage>) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) }
          : c,
      ),
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

  const changeMode = (v: boolean) => {
    setImmediate(v)
    saveImmediateMode(v)
  }

  // Decorate a scored result with the engine's tags, exactly as fast mode does,
  // so the cards look identical whichever pass produced them.
  const decorate = useCallback(
    (scored: ScoredWebProperty[]): Property[] =>
      scored.map((r) => ({
        ...r.property,
        smartTags: [...r.tags, ...(r.property.smartTags ?? [])],
      })),
    [],
  )

  // ── The background personalisation upgrade (port of _upgradeSearch) ────────
  // ORDER (and its fail-soft try/catch behaviour) mirrors the Dart exactly:
  //   enrich → cohort-ranked (limit 40) → lifestyle filter + lifestyle rank →
  //   verification gate → warm server reply → per-result explanations → swap.
  const upgradeSearch = useCallback(
    async (ctx: {
      convId: string
      text: string
      query: ParsedQuery
      persona: Persona
      conversationText: string
      catalogue: Property[]
      localResults: ScoredWebProperty[]
      historyTurns: ChatTurn[]
      searched: boolean
      userTurns: number
      resultsMsgId: string
      howChoseMsgId: string
      replyMsgId: string | null
    }) => {
      let query = ctx.query
      try {
        query = await ettiEnrich(ctx.text, query)
      } catch {
        // graceful — the on-device query already stands
      }

      let upgraded: ScoredWebProperty[] = []
      let notes: Record<string, string> = {}
      try {
        // The same anti-hallucination gate the INSTANT path applies — otherwise
        // the server-ranked swap-in could reintroduce geo-far / over-budget flats
        // the instant results had already filtered out.
        const cohort = await cohortRanked({
          query,
          conversationText: ctx.conversationText,
          persona: ctx.persona,
          catalogue: ctx.catalogue,
          limit: 40,
        })
        const verified = verifyResults(
          rankByLifestyle(
            applyLifestyleFilter(cohort, ctx.persona),
            ctx.conversationText,
          ).slice(0, 10),
          query,
          ctx.catalogue,
        )
        upgraded = verified.results
        notes = verified.notes
      } catch {
        upgraded = []
        notes = {}
      }

      const sr = await serverReply(ctx.historyTurns)
      const warm =
        sr?.reply ??
        localReply({
          query,
          lastUserText: ctx.text,
          conversationText: ctx.conversationText,
          persona: ctx.persona,
          searched: ctx.searched,
          userTurns: ctx.userTurns,
          openerIdx: openerIdxRef.current++,
        }) ??
        warmFallback(openerIdxRef.current)

      // Quiet swap: a failed cohort pass keeps whatever is already on screen.
      const final = upgraded.length > 0 ? upgraded : ctx.localResults
      if (upgraded.length > 0) {
        mergeProps(decorate(upgraded))
        patchMessage(ctx.convId, ctx.resultsMsgId, {
          listingIds: upgraded.map((r) => r.property.id),
          notes,
          deep: true,
        })
      }
      if (warm && ctx.replyMsgId) patchMessage(ctx.convId, ctx.replyMsgId, { text: warm })

      if (final.length > 0) {
        const exp = await fetchExplanations(final, query)
        if (exp) {
          if (exp.howIChose) patchMessage(ctx.convId, ctx.howChoseMsgId, { text: exp.howIChose })
          if (Object.keys(exp.perProperty).length > 0) {
            patchMessage(ctx.convId, ctx.resultsMsgId, { explanations: exp.perProperty })
          }
        }
      }
    },
    [decorate, mergeProps, patchMessage],
  )

  // ── Engine: mode gate → instant on-device answer → background upgrade ──────
  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text) return
      setInput('')

      // Snapshot prior turns BEFORE appending.
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
      appendMessages(convId, [{ id: newMessageId(), role: 'user', text }])

      // Accumulated conversation state — the web's stand-in for the app's
      // _query / _persona / _searched / _interviewAsked fields.
      const userTexts = [...priorMessages.filter((m) => m.role === 'user').map((m) => m.text), text]
      const conversationText = userTexts.join(' ')
      const persona = personaFrom(conversationText)
      const query = applyLifestyle(conversationQuery(userTexts), persona)
      const searched = priorMessages.some((m) => (m.listingIds?.length ?? 0) > 0)
      const asked = new Set(
        priorMessages.map((m) => m.interviewKey).filter((k): k is string => !!k),
      )
      const userTurns = userTexts.length

      // MODE: fast → search instantly. Personalization → a short guided INTERVIEW
      // (≤3 adaptive questions, each with a "why") BEFORE searching. The user can
      // cut it short any time ("תראי לי כבר").
      let shouldSearch: boolean
      if (immediate) {
        shouldSearch =
          !queryIsEmpty(query) &&
          (searched || wantsResultsNow(text) || userTurns >= 2 || queryIsRich(query))
      } else {
        const nextQ = searched ? null : nextInterviewQuestion(query, conversationText, persona, asked)
        const wantsNow = wantsResultsNow(text) && asked.size >= 1
        const interviewDone = searched || asked.size >= MAX_INTERVIEW_QUESTIONS || nextQ === null
        if (!queryIsEmpty(query) && (interviewDone || wantsNow)) {
          shouldSearch = true
        } else if (nextQ) {
          // Ask the next question (with its "why") instead of searching yet.
          const intro = asked.size === 0 ? INTERVIEW_INTRO : ''
          const chips = asked.size >= 1 ? [...nextQ.chips, SKIP_CHIP] : nextQ.chips
          appendMessages(convId, [
            {
              id: newMessageId(),
              role: 'ati',
              text: `${intro}${nextQ.q}`,
              why: nextQ.why,
              chips,
              interviewKey: nextQ.key,
            },
          ])
          return
        } else {
          shouldSearch = !queryIsEmpty(query)
        }
      }

      // ⚡ INSTANT — rank ON-DEVICE right now (no network, no LLM).
      const { items } = await ensureProperties()
      let results: ScoredWebProperty[] = []
      let notes: Record<string, string> = {}
      if (shouldSearch) {
        const verified = localSearch(query, items, persona, conversationText)
        results = verified.results
        notes = verified.notes
      }
      let anyExact = results.some((r) => r.exact)

      // ANTI-HALLUCINATION: nothing matched exactly → look within 10km of the
      // city with the SAME filters and say clearly they're only nearby.
      let widenNote: string | null = null
      if (shouldSearch && results.length === 0) {
        const nearby = nearbySameFilters(query, items, persona)
        if (nearby.length > 0) {
          results = nearby
          notes = {}
          anyExact = results.some((r) => r.exact)
          const city = query.city?.trim() || 'שם'
          widenNote =
            `לא מצאתי דירות שעונות בדיוק לבקשה ב${city} עם הסינונים האלה — ` +
            `אבל אלה עד 10 ק"מ מ${city}, עם אותם סינונים בדיוק (לא רחוק!)`
        }
      }

      const replyText = instantReply(shouldSearch, results, anyExact)
      const out: AtiMessage[] = []
      const replyMsgId = replyText ? newMessageId() : null
      if (replyMsgId) out.push({ id: replyMsgId, role: 'ati', text: replyText })

      let resultsMsgId: string | null = null
      let howChoseMsgId: string | null = null

      if (shouldSearch) {
        if (results.length === 0) {
          // Honest — nothing matched, not even within 10km with the same filters.
          const city = query.city?.trim() || 'האזור הזה'
          const chips: string[] = []
          if (query.city) chips.push(`אזור ${query.city}`)
          if (query.maxPrice !== null) chips.push(`עד ${Math.round(query.maxPrice * 1.2)} ₪`)
          out.push({
            id: newMessageId(),
            role: 'ati',
            text:
              `לא מצאתי דירות שעונות לבקשה ב${city} עם הסינונים האלה 😕\n` +
              'אפשר להרחיב את האזור, להעלות תקציב או להוריד סינונים כדי למצוא אופציות מתאימות.',
            chips,
          })
        } else {
          if (widenNote) out.push({ id: newMessageId(), role: 'ati', text: `${widenNote} 👇` })
          // Let the user know a lifestyle constraint shaped the results (once).
          const noteShown = priorMessages.some((m) => m.text.startsWith(LIFESTYLE_NOTE_PREFIX))
          const note = noteShown ? null : lifestyleNote(persona)
          if (note) out.push({ id: newMessageId(), role: 'ati', text: note })
          // Transparency header: "how I chose these" — the engine's fallback now,
          // upgraded to the backend explainer's version in the background.
          howChoseMsgId = newMessageId()
          out.push({ id: howChoseMsgId, role: 'ati', text: howIChoseFallback(results) })
          resultsMsgId = newMessageId()
          out.push({
            id: resultsMsgId,
            role: 'ati',
            text: buildReply(query, results),
            listingIds: results.map((r) => r.property.id),
            notes,
            chips: refinePromptChips(query),
          })
          mergeProps(decorate(results))
        }
      } else {
        // Not enough to search yet → ask the single most useful missing detail;
        // otherwise never leave her silent.
        const clarify = clarifyingPrompt(query)
        if (clarify) {
          out.push({ id: newMessageId(), role: 'ati', text: clarify.text, chips: clarify.chips })
        } else if (!replyText) {
          out.push({ id: newMessageId(), role: 'ati', text: localAck(query) })
        }
      }

      appendMessages(convId, out)

      // 🎯 BACKGROUND personalisation — the instant results are already on screen.
      // Skipped entirely in fast mode (purely on-device, nothing to wait for).
      if (!immediate && shouldSearch && results.length > 0 && resultsMsgId && howChoseMsgId) {
        // The server reply's history excludes result-card bubbles (as the Dart's
        // _serverReply does) and keeps the last 10 turns.
        const historyTurns: ChatTurn[] = [
          ...priorMessages,
          { role: 'user' as const, text },
          ...out,
        ]
          .filter((m) => m.text.trim().length > 0 && !(m.listingIds?.length ?? 0))
          .slice(-10)
          .map((m) => ({
            role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
            text: m.text,
          }))

        const activeConvId = convId
        setDeepBusyConvId(activeConvId)
        upgradeSearch({
          convId: activeConvId,
          text,
          query,
          persona,
          conversationText,
          catalogue: items,
          localResults: results,
          historyTurns,
          searched,
          userTurns,
          resultsMsgId,
          howChoseMsgId,
          replyMsgId,
        })
          .catch(() => {
            // Fail-soft by contract — the instant results stay exactly as they are.
          })
          .finally(() => setDeepBusyConvId((cur) => (cur === activeConvId ? null : cur)))
      }
    },
    [
      activeId,
      conversations,
      appendMessages,
      createConversation,
      decorate,
      immediate,
      mergeProps,
      upgradeSearch,
    ],
  )

  // ── Registration gate — fires ONLY on the send action ─────────────────────
  // A registered visitor goes straight through `send` (zero extra work). An
  // unregistered one sees the modal, and the very same message is sent for them
  // the moment they finish signing in.
  const { requireAuth } = useAuthGate()
  const sendRef = useRef(send)
  sendRef.current = send
  const guardedSend = useCallback(
    (raw: string) => {
      if (!raw.trim()) return
      requireAuth(SEND_REASON, () => sendRef.current(raw))
    },
    [requireAuth],
  )

  // Routes a quick-reply chip: the refine prompt is handled locally (no network),
  // everything else goes through a normal turn (port of _onChipTap).
  const onChipTap = useCallback(
    (chip: string) => {
      const conv = conversations.find((c) => c.id === activeId)
      if (chip === REFINE_YES) {
        if (!conv) return
        const userTexts = conv.messages.filter((m) => m.role === 'user').map((m) => m.text)
        const persona = personaFrom(userTexts.join(' '))
        const query = applyLifestyle(conversationQuery(userTexts), persona)
        appendMessages(conv.id, [
          {
            id: newMessageId(),
            role: 'ati',
            text: 'מעולה 😊 מה נדייק כדי לצמצם למה שהכי מתאים לך?',
            chips: refineChips(query),
          },
        ])
        return
      }
      if (chip === REFINE_NO) {
        if (!conv) return
        appendMessages(conv.id, [
          {
            id: newMessageId(),
            role: 'ati',
            text: 'מקסים! 🙏 אם תרצה לחדד עוד משהו בהמשך — אני כאן.',
          },
        ])
        return
      }
      guardedSend(chip)
    },
    [activeId, appendMessages, conversations, guardedSend],
  )

  const resolveListings = (ids: string[]): Property[] =>
    ids.map((id) => propsMapRef.current.get(id)).filter((p): p is Property => !!p)

  const showChips = !active || active.messages.length === 0

  const modeHint = useMemo(
    () =>
      immediate
        ? 'תשובות מיידיות מהמכשיר — בלי המתנה'
        : 'אתי שואלת כמה שאלות קצרות ואז מדייקת את התוצאות ברקע',
    [immediate],
  )

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

        {/* Speed mode */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-3">
          <SpeedModeToggle immediate={immediate} onChange={changeMode} />
          <p className="text-[11.5px] font-semibold text-secondary-text">{modeHint}</p>
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
                  <div key={m.id ?? i} className="flex flex-col">
                    {m.role === 'user' ? (
                      <div className="max-w-[78%] self-end rounded-2xl rounded-br-md bg-primary-light2 px-4 py-2.5 text-[14.5px] font-semibold leading-relaxed text-navy">
                        {m.text}
                      </div>
                    ) : (
                      <div className="flex max-w-full items-start gap-2.5 self-start">
                        <AtiAvatar />
                        <div className="min-w-0">
                          {m.deep && <p className="mb-1 text-[11px] font-black text-primary">מותאם אישית ✨</p>}
                          <div className="max-w-[560px] whitespace-pre-line rounded-2xl rounded-bl-md bg-cloud px-4 py-2.5 text-[14.5px] font-semibold leading-relaxed text-navy">
                            {m.text}
                            {m.why && (
                              <span className="mt-1.5 block text-[12px] font-semibold leading-relaxed text-secondary-text">
                                💡 {m.why}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {listings.length > 0 && (
                      <div className="no-scrollbar mt-3 flex snap-x gap-4 overflow-x-auto pb-2">
                        {listings.map((p) => (
                          <div key={p.id} className="snap-start">
                            <a href={`/listing/${p.id}`} className="block">
                              <PropertyCard property={p} />
                            </a>
                            {(m.notes?.[p.id] || m.explanations?.[p.id]) && (
                              <p className="mt-1.5 max-w-[280px] text-[11.5px] font-semibold leading-relaxed text-secondary-text">
                                {m.notes?.[p.id] && (
                                  <span className="text-navy">{m.notes[p.id]}</span>
                                )}
                                {m.notes?.[p.id] && m.explanations?.[p.id] ? ' · ' : ''}
                                {m.explanations?.[p.id]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {m.role === 'ati' && (m.chips?.length ?? 0) > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-2 ps-[42px]">
                        {m.chips!.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => onChipTap(chip)}
                            className="cursor-pointer rounded-full border border-border-app bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-navy transition hover:border-primary hover:text-primary"
                          >
                            {chip}
                          </button>
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
                    אתי מעמיקה… מדייקת את התוצאות בשבילך ✨
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
                onClick={() => guardedSend(chip)}
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
            guardedSend(input)
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
