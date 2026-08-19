'use client'

// אתי on the web — Header removed, Hero chatbox raised up slightly,
// Real Rently app features included (אינטליגנציית אזור, השוואת מחירי שוק, סינון סגנון חיים, ניתוח חוזה שכירות),
// and Send button formatted with crisp SF Hebrew Rounded font.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import {
  Add,
  DocumentText,
  Edit2,
  HambergerMenu,
  Location,
  Magicpen,
  MagicStar,
  Messages3,
  SearchNormal1,
  Star,
  Trash,
  Microphone2,
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
import ListingCarousel from '@/components/keyz/ListingCarousel'
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

// One property fetch per page load, shared with every send.
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
const SEND_REASON = 'כדי שאתי תזכור את השיחה ותמשיך אותה בפעם הבאה'

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

// ── USER COMPONENT 1: Uiverse Liquid Bubble Button (Rently Blue Theme) ───────
interface UserSendButtonProps {
  disabled?: boolean
  onClick?: () => void
}

const UserSendButton: React.FC<UserSendButtonProps> = ({ disabled, onClick }) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ opacity: disabled ? 0.45 : 1 }}>
      {mounted ? (
        <StyledUiverseWrapper>
          {/* type="button", not "submit": this sits inside a <form onSubmit>,
              and a submit button fires BOTH its own onClick and the form's
              onSubmit for the same click — sending every message twice. The
              form's onSubmit already calls the same handler. */}
          <button className="uiverse" type="button" disabled={disabled} onClick={disabled ? undefined : onClick}>
            <div className="wrapper">
              <span>שלח</span>
              <div className="circle circle-12" />
              <div className="circle circle-11" />
              <div className="circle circle-10" />
              <div className="circle circle-9" />
              <div className="circle circle-8" />
              <div className="circle circle-7" />
              <div className="circle circle-6" />
              <div className="circle circle-5" />
              <div className="circle circle-4" />
              <div className="circle circle-3" />
              <div className="circle circle-2" />
              <div className="circle circle-1" />
            </div>
          </button>
        </StyledUiverseWrapper>
      ) : (
        <button
          className="rounded-[24px] bg-[#2563EB] px-5 py-2 text-[15px] font-bold text-white shadow-md"
          type="button"
          disabled={disabled}
          onClick={disabled ? undefined : onClick}
        >
          <span>שלח</span>
        </button>
      )}
    </div>
  )
}

const StyledUiverseWrapper = styled.div`
  .uiverse {
    --duration: 7s;
    --easing: linear;
    --c-color-1: rgba(56, 182, 255, 0.75);
    --c-color-2: #2563EB;
    --c-color-3: #00D2FF;
    --c-color-4: rgba(0, 97, 255, 0.85);
    --c-shadow: rgba(0, 97, 255, 0.4);
    --c-shadow-inset-top: rgba(186, 230, 253, 0.9);
    --c-shadow-inset-bottom: rgba(0, 97, 255, 0.8);
    --c-radial-inner: #2563EB;
    --c-radial-outer: #38B6FF;
    --c-color: #ffffff;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
    outline: none;
    position: relative;
    cursor: pointer;
    border: none;
    display: table;
    border-radius: 24px;
    padding: 0;
    margin: 0;
    text-align: center;
    font-family: "SF Hebrew Rounded", -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.02em;
    line-height: 1.5;
    color: var(--c-color);
    background: radial-gradient(
      circle,
      var(--c-radial-inner),
      var(--c-radial-outer) 80%
    );
    box-shadow: 0 0 14px var(--c-shadow);
  }

  .uiverse:before {
    content: "";
    pointer-events: none;
    position: absolute;
    z-index: 3;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    border-radius: 24px;
    box-shadow:
      inset 0 3px 12px var(--c-shadow-inset-top),
      inset 0 -3px 4px var(--c-shadow-inset-bottom);
  }

  .uiverse .wrapper {
    -webkit-mask-image: -webkit-radial-gradient(white, black);
    overflow: hidden;
    border-radius: 24px;
    min-width: 90px;
    padding: 9px 20px;
  }

  .uiverse .wrapper span {
    display: inline-block;
    position: relative;
    z-index: 1;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
  }

  .uiverse:hover {
    --duration: 1400ms;
  }

  .uiverse .wrapper .circle {
    position: absolute;
    left: 0;
    top: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    filter: blur(var(--blur, 8px));
    background: var(--background, transparent);
    transform: translate(var(--x, 0), var(--y, 0)) translateZ(0);
    animation: var(--animation, none) var(--duration) var(--easing) infinite;
  }

  .uiverse .wrapper .circle.circle-1,
  .uiverse .wrapper .circle.circle-9,
  .uiverse .wrapper .circle.circle-10 {
    --background: var(--c-color-4);
  }

  .uiverse .wrapper .circle.circle-3,
  .uiverse .wrapper .circle.circle-4 {
    --background: var(--c-color-2);
    --blur: 14px;
  }

  .uiverse .wrapper .circle.circle-5,
  .uiverse .wrapper .circle.circle-6 {
    --background: var(--c-color-3);
    --blur: 16px;
  }

  .uiverse .wrapper .circle.circle-2,
  .uiverse .wrapper .circle.circle-7,
  .uiverse .wrapper .circle.circle-8,
  .uiverse .wrapper .circle.circle-11,
  .uiverse .wrapper .circle.circle-12 {
    --background: var(--c-color-1);
    --blur: 12px;
  }

  .uiverse .wrapper .circle.circle-1 {
    --x: 0;
    --y: -40px;
    --animation: circle-1;
  }

  .uiverse .wrapper .circle.circle-2 {
    --x: 92px;
    --y: 8px;
    --animation: circle-2;
  }

  .uiverse .wrapper .circle.circle-3 {
    --x: -12px;
    --y: -12px;
    --animation: circle-3;
  }

  .uiverse .wrapper .circle.circle-4 {
    --x: 80px;
    --y: -12px;
    --animation: circle-4;
  }

  .uiverse .wrapper .circle.circle-5 {
    --x: 12px;
    --y: -4px;
    --animation: circle-5;
  }

  .uiverse .wrapper .circle.circle-6 {
    --x: 56px;
    --y: 16px;
    --animation: circle-6;
  }

  .uiverse .wrapper .circle.circle-7 {
    --x: 8px;
    --y: 28px;
    --animation: circle-7;
  }

  .uiverse .wrapper .circle.circle-8 {
    --x: 28px;
    --y: -4px;
    --animation: circle-8;
  }

  .uiverse .wrapper .circle.circle-9 {
    --x: 20px;
    --y: -12px;
    --animation: circle-9;
  }

  .uiverse .wrapper .circle.circle-10 {
    --x: 64px;
    --y: 16px;
    --animation: circle-10;
  }

  .uiverse .wrapper .circle.circle-11 {
    --x: 4px;
    --y: 4px;
    --animation: circle-11;
  }

  .uiverse .wrapper .circle.circle-12 {
    --blur: 14px;
    --x: 52px;
    --y: 4px;
    --animation: circle-12;
  }

  @keyframes circle-1 {
    33% {
      transform: translate(0px, 16px) translateZ(0);
    }

    66% {
      transform: translate(12px, 64px) translateZ(0);
    }
  }

  @keyframes circle-2 {
    33% {
      transform: translate(80px, -10px) translateZ(0);
    }

    66% {
      transform: translate(72px, -48px) translateZ(0);
    }
  }

  @keyframes circle-3 {
    33% {
      transform: translate(20px, 12px) translateZ(0);
    }

    66% {
      transform: translate(12px, 4px) translateZ(0);
    }
  }

  @keyframes circle-4 {
    33% {
      transform: translate(76px, -12px) translateZ(0);
    }

    66% {
      transform: translate(112px, -8px) translateZ(0);
    }
  }

  @keyframes circle-5 {
    33% {
      transform: translate(84px, 28px) translateZ(0);
    }

    66% {
      transform: translate(40px, -32px) translateZ(0);
    }
  }

  @keyframes circle-6 {
    33% {
      transform: translate(28px, -16px) translateZ(0);
    }

    66% {
      transform: translate(76px, -56px) translateZ(0);
    }
  }

  @keyframes circle-7 {
    33% {
      transform: translate(8px, 28px) translateZ(0);
    }

    66% {
      transform: translate(20px, -60px) translateZ(0);
    }
  }

  @keyframes circle-8 {
    33% {
      transform: translate(32px, -4px) translateZ(0);
    }

    66% {
      transform: translate(56px, -20px) translateZ(0);
    }
  }

  @keyframes circle-9 {
    33% {
      transform: translate(20px, -12px) translateZ(0);
    }

    66% {
      transform: translate(80px, -8px) translateZ(0);
    }
  }

  @keyframes circle-10 {
    33% {
      transform: translate(68px, 20px) translateZ(0);
    }

    66% {
      transform: translate(100px, 28px) translateZ(0);
    }
  }

  @keyframes circle-11 {
    33% {
      transform: translate(4px, 4px) translateZ(0);
    }

    66% {
      transform: translate(68px, 20px) translateZ(0);
    }
  }

  @keyframes circle-12 {
    33% {
      transform: translate(56px, 0px) translateZ(0);
    }

    66% {
      transform: translate(60px, -32px) translateZ(0);
    }
  }
`;

// 3D Iridescent Orb Graphic (Rently Blue Palette)
function IridescentOrb() {
  return (
    <div className="relative flex items-center justify-center my-4">
      <div className="absolute h-36 w-36 rounded-full bg-gradient-to-r from-[#38B6FF]/30 via-[#2563EB]/20 to-[#38B6FF]/30 blur-2xl animate-pulse" />
      <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-sky-200 via-blue-100 to-sky-300 p-0.5 shadow-[0_10px_35px_rgba(37,99,235,0.25)] transition-transform duration-700 hover:scale-105">
        <div className="h-full w-full rounded-full bg-gradient-to-br from-white/90 via-sky-50/70 to-blue-100/90 backdrop-blur-md relative overflow-hidden flex items-center justify-center">
          <div className="absolute -top-3 -left-3 h-10 w-10 rounded-full bg-white/80 blur-sm" />
          <div className="absolute bottom-1 right-2 h-7 w-7 rounded-full bg-sky-300/40 blur-md" />
          <div className="absolute top-4 right-3 h-4 w-4 rounded-full bg-blue-300/30 blur-sm" />
          <MagicStar size={32} variant="Bold" color="currentColor" className="text-[#2563EB] drop-shadow-sm relative z-10 animate-spin-slow" />
        </div>
      </div>
    </div>
  )
}

function AtiAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#2563EB] to-[#38B6FF] text-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <MagicStar size={Math.round(size * 0.55)} variant="Bold" color="currentColor" />
    </span>
  )
}

export default function AtiWorkspace() {
  // Scopes conversation history to the signed-in account (falls back to a
  // shared "guest" bucket for anonymous visitors — see store.ts's getKey).
  // Previously loadConversations()/saveConversations() were called with no
  // uid at all, so every visitor on a given browser shared the SAME bucket
  // regardless of who was signed in — on a shared/public device, whoever
  // signed in second saw the first person's entire chat history.
  const { requireAuth, isRegistered, user } = useAuthGate()
  const scopeUid = user && !user.isAnonymous ? user.uid : null

  const [conversations, setConversations] = useState<AtiConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [searchHistoryFilter, setSearchHistoryFilter] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deepBusyConvId, setDeepBusyConvId] = useState<string | null>(null)
  const [immediate, setImmediate] = useState(true)
  const [sidebarNavTab, setSidebarNavTab] = useState<'recent' | 'saved'>('recent')
  const [listening, setListening] = useState(false)
  const [hasMic, setHasMic] = useState(false)

  const propsMapRef = useRef<Map<string, Property>>(new Map())
  const [, setPropsVersion] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const openerIdxRef = useRef(0)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  // ── Bootstrapping ──────────────────────────────────────────────────────────
  // Re-runs whenever the resolved account changes (anonymous → real user, or
  // a different real user on the same browser) so the loaded/saved
  // conversation bucket always matches who's actually signed in.
  useEffect(() => {
    setConversations(loadConversations(scopeUid))
    setActiveId(null)
    setLoaded(true)
  }, [scopeUid])

  useEffect(() => {
    const savedImm = loadImmediateMode()
    setImmediate(savedImm !== undefined ? savedImm : true)
    ensureProperties().then(({ items }) => {
      const map = propsMapRef.current
      for (const p of items) if (p?.id && !map.has(p.id)) map.set(p.id, p)
      setPropsVersion((v) => v + 1)
    })
  }, [])

  useEffect(() => {
    if (loaded) saveConversations(conversations, scopeUid)
  }, [conversations, loaded, scopeUid])

  useEffect(() => {
    setHasMic(!!getSpeechRecognition())
    return () => {
      recRef.current?.abort()
    }
  }, [])

  const active = conversations.find((c) => c.id === activeId) ?? null

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

  const togglePersonalizedMode = (isPersonalizedChecked: boolean) => {
    const newImmediate = !isPersonalizedChecked
    setImmediate(newImmediate)
    saveImmediateMode(newImmediate)
  }

  const toggleSaved = (id: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, saved: !c.saved } : c)))
  }

  // ── Voice (real Web Speech mic — same implementation as עזרא's) ──────────
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
      if (transcript) setInput(transcript)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  const decorate = useCallback(
    (scored: ScoredWebProperty[]): Property[] =>
      scored.map((r) => ({
        ...r.property,
        smartTags: [...r.tags, ...(r.property.smartTags ?? [])],
      })),
    [],
  )

  // ── Background Personalization Upgrade Pass ─────────────────────────────
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
        // graceful
      }

      let upgraded: ScoredWebProperty[] = []
      let notes: Record<string, string> = {}
      try {
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

  // ── Send Handler ────────────────────────────────────────────────────────
  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text) return
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'

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

      const userTexts = [...priorMessages.filter((m) => m.role === 'user').map((m) => m.text), text]
      const conversationText = userTexts.join(' ')
      const persona = personaFrom(conversationText)
      const query = applyLifestyle(conversationQuery(userTexts), persona)
      const searched = priorMessages.some((m) => (m.listingIds?.length ?? 0) > 0)
      const asked = new Set(
        priorMessages.map((m) => m.interviewKey).filter((k): k is string => !!k),
      )
      const userTurns = userTexts.length

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

      const { items } = await ensureProperties()
      let results: ScoredWebProperty[] = []
      let notes: Record<string, string> = {}
      if (shouldSearch) {
        const verified = localSearch(query, items, persona, conversationText)
        results = verified.results
        notes = verified.notes
      }
      let anyExact = results.some((r) => r.exact)

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
          const noteShown = priorMessages.some((m) => m.text.startsWith(LIFESTYLE_NOTE_PREFIX))
          const note = noteShown ? null : lifestyleNote(persona)
          if (note) out.push({ id: newMessageId(), role: 'ati', text: note })
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
        const clarify = clarifyingPrompt(query)
        if (clarify) {
          out.push({ id: newMessageId(), role: 'ati', text: clarify.text, chips: clarify.chips })
        } else if (!replyText) {
          out.push({ id: newMessageId(), role: 'ati', text: localAck(query) })
        }
      }

      appendMessages(convId, out)

      if (!immediate && shouldSearch && results.length > 0 && resultsMsgId && howChoseMsgId) {
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
          .catch(() => {})
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

  // Handle incoming query from Homepage Hero: ?q=...
  const initialQueryHandledRef = useRef(false)
  useEffect(() => {
    if (!loaded || initialQueryHandledRef.current) return
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const initialQuery = params.get('q')
    const mode = params.get('mode')
    if (initialQuery) {
      initialQueryHandledRef.current = true
      if (mode === 'fast') {
        setImmediate(true)
        saveImmediateMode(true)
      } else if (mode === 'deep') {
        setImmediate(false)
        saveImmediateMode(false)
      }
      window.history.replaceState({}, '', '/ati')
      void send(initialQuery)
    }
  }, [loaded, send])
  const sendRef = useRef(send)
  sendRef.current = send
  // Declining the sign-in gate is intentional (see AuthGate's dismissGate) —
  // the message is silently dropped so browsing stays frictionless. But for
  // a chat send that LOOKS like it should just work, silence reads as "stuck":
  // the input keeps the text and the send button stays enabled, so tapping it
  // again just reopens the identical modal with no clue why. This hint is the
  // only thing that changes — it explains once, it doesn't touch the gate.
  const [showAuthHint, setShowAuthHint] = useState(false)
  const guardedSend = useCallback(
    (raw: string) => {
      if (!raw.trim()) return
      if (!isRegistered) setShowAuthHint(true)
      requireAuth(SEND_REASON, () => {
        setShowAuthHint(false)
        sendRef.current(raw)
      })
    },
    [requireAuth, isRegistered],
  )

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

  const filteredConversations = useMemo(() => {
    let list = conversations
    if (sidebarNavTab === 'saved') {
      list = list.filter((c) => c.saved === true)
    }
    if (!searchHistoryFilter.trim()) return list
    const q = searchHistoryFilter.trim().toLowerCase()
    return list.filter((c) => c.title.toLowerCase().includes(q))
  }, [conversations, searchHistoryFilter, sidebarNavTab])

  const groupedConversations = useMemo(() => {
    const today: AtiConversation[] = []
    const week: AtiConversation[] = []
    const older: AtiConversation[] = []
    const now = Date.now()
    const ONE_DAY = 24 * 60 * 60 * 1000

    for (const c of filteredConversations) {
      const diff = now - c.createdAt
      if (diff < ONE_DAY) {
        today.push(c)
      } else if (diff < 7 * ONE_DAY) {
        week.push(c)
      } else {
        older.push(c)
      }
    }
    return { today, week, older }
  }, [filteredConversations])

  // ── Floating Collapsible Sidebar Component ─────────────────────────────────
  const sidebarContent = (
    <div className={`relative flex h-full flex-col bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-lg transition-all duration-300 overflow-hidden ${
      isSidebarCollapsed ? 'w-[72px]' : 'w-[270px]'
    }`}>
      {/* Sidebar Header: Brand & Collapse Toggle */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-100">
        {!isSidebarCollapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#38B6FF] text-white shadow-md shrink-0">
              <MagicStar size={20} variant="Bold" color="currentColor" />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-[15px] font-black text-slate-900 leading-tight">Rently</span>
              <span className="block truncate text-[11px] font-bold text-[#2563EB]">אתי · העוזרת החכמה</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#38B6FF] text-white shadow-md shrink-0">
            <MagicStar size={20} variant="Bold" color="currentColor" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          aria-label={isSidebarCollapsed ? "הרחב סרגל צד" : "כווץ סרגל צד"}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] transition shrink-0"
        >
          <HambergerMenu size={16} color="currentColor" />
        </button>
      </div>

      {/* Action: New Conversation */}
      <div className="p-3">
        {!isSidebarCollapsed ? (
          <button
            type="button"
            onClick={() => {
              createConversation('שיחה חדשה')
              setSidebarOpen(false)
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-[13.5px] font-bold text-white shadow-md transition hover:bg-blue-700"
          >
            <Add size={18} color="currentColor" />
            <span>שיחה חדשה</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => createConversation('שיחה חדשה')}
            title="שיחה חדשה"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-md transition hover:bg-blue-700"
          >
            <Add size={20} color="currentColor" />
          </button>
        )}
      </div>

      {/* Search Input in Sidebar */}
      {!isSidebarCollapsed ? (
        <div className="px-3 pb-2">
          <div className="relative flex items-center rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-1.5 focus-within:border-[#2563EB] focus-within:bg-white transition">
            <SearchNormal1 size={15} color="currentColor" className="text-slate-400 shrink-0 me-2" />
            <input
              type="text"
              value={searchHistoryFilter}
              onChange={(e) => setSearchHistoryFilter(e.target.value)}
              placeholder="חפש בשיחות..."
              className="w-full bg-transparent text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      ) : (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            title="חפש בשיחות"
          >
            <SearchNormal1 size={18} color="currentColor" />
          </button>
        </div>
      )}

      {/* Chat-Focused Navigation Menu */}
      <div className="px-2 py-2 border-b border-slate-100">
        <nav className="flex flex-col gap-1">
          {!isSidebarCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => setSidebarNavTab('recent')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-bold transition w-full text-start ${
                  sidebarNavTab === 'recent'
                    ? 'bg-blue-50/80 text-[#2563EB]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Messages3 size={16} color="currentColor" />
                <span>שיחות אחרונות</span>
              </button>

              <button
                type="button"
                onClick={() => setSidebarNavTab('saved')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-bold transition w-full text-start ${
                  sidebarNavTab === 'saved'
                    ? 'bg-blue-50/80 text-[#2563EB]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Star size={16} color="currentColor" />
                <span>שיחות שמורות</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInput('📍 אינטליגנציית אזור: ')
                  textareaRef.current?.focus()
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition w-full text-start"
              >
                <Location size={16} color="currentColor" />
                <span>אינטליגנציית אזור</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInput('📄 בדיקת חוזה שכירות: ')
                  textareaRef.current?.focus()
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition w-full text-start"
              >
                <DocumentText size={16} color="currentColor" />
                <span>בדיקת חוזים</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                title="שיחות אחרונות"
                onClick={() => setSidebarNavTab('recent')}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                  sidebarNavTab === 'recent' ? 'bg-blue-50 text-[#2563EB]' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Messages3 size={18} color="currentColor" />
              </button>
              <button
                type="button"
                title="שיחות שמורות"
                onClick={() => setSidebarNavTab('saved')}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                  sidebarNavTab === 'saved' ? 'bg-blue-50 text-[#2563EB]' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Star size={18} color="currentColor" />
              </button>
              <button
                type="button"
                title="אינטליגנציית אזור"
                onClick={() => {
                  setInput('📍 אינטליגנציית אזור: ')
                  textareaRef.current?.focus()
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <Location size={18} color="currentColor" />
              </button>
              <button
                type="button"
                title="בדיקת חוזים"
                onClick={() => {
                  setInput('📄 בדיקת חוזה שכירות: ')
                  textareaRef.current?.focus()
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <DocumentText size={18} color="currentColor" />
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* History Items Categorized by Date */}
      <div className="no-scrollbar flex-1 overflow-y-auto p-2 space-y-4">
        {!isSidebarCollapsed ? (
          filteredConversations.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] font-medium text-slate-400">
              אין שיחות קודמות למציאה
            </p>
          ) : (
            <>
              {groupedConversations.today.length > 0 && (
                <div>
                  <p className="px-3 mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    היום
                  </p>
                  {groupedConversations.today.map((c) => renderConversationItem(c))}
                </div>
              )}

              {groupedConversations.week.length > 0 && (
                <div>
                  <p className="px-3 mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    7 הימים האחרונים
                  </p>
                  {groupedConversations.week.map((c) => renderConversationItem(c))}
                </div>
              )}

              {groupedConversations.older.length > 0 && (
                <div>
                  <p className="px-3 mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    ישן יותר
                  </p>
                  {groupedConversations.older.map((c) => renderConversationItem(c))}
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
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB]'
                }`}
              >
                {c.title.charAt(0) || 'ש'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Bottom Footer: Search-mode Segmented Control */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70">
        {!isSidebarCollapsed ? (
          <div
            role="group"
            aria-label="מצב חיפוש"
            className="flex gap-1 rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm"
          >
            <button
              type="button"
              onClick={() => togglePersonalizedMode(false)}
              className={`flex-1 rounded-xl px-2 py-1.5 text-[12px] font-bold transition ${
                immediate
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              מהיר
            </button>
            <button
              type="button"
              onClick={() => togglePersonalizedMode(true)}
              className={`flex-1 rounded-xl px-2 py-1.5 text-[12px] font-bold transition ${
                !immediate
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              מותאם אישית
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              title={immediate ? 'מצב מהיר — לחצו למעבר למותאם אישית' : 'מצב מותאם אישית — לחצו למעבר למהיר'}
              onClick={() => togglePersonalizedMode(immediate)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                !immediate ? 'bg-[#2563EB] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-[#2563EB]'
              }`}
            >
              <Magicpen size={18} color="currentColor" />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  function renderConversationItem(c: AtiConversation) {
    const isSelected = c.id === activeId
    return (
      <div
        key={c.id}
        className={`group relative mb-1 rounded-xl transition ${
          isSelected ? 'bg-blue-50/90 text-[#2563EB] font-bold' : 'hover:bg-slate-100/70 text-slate-700'
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
              className="w-full rounded-lg border border-blue-300 bg-white px-2 py-1 text-[12.5px] font-medium text-slate-900 outline-none focus:ring-1 focus:ring-[#2563EB]"
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
          </button>
        )}

        {confirmDeleteId === c.id ? (
          <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-white px-2 py-0.5 border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-700">למחוק?</span>
            <button
              type="button"
              onClick={() => deleteConversation(c.id)}
              className="text-[11px] font-bold text-red-500 hover:underline"
            >
              כן
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(c.id)}
              className="text-[11px] font-bold text-slate-400 hover:underline"
            >
              לא
            </button>
          </div>
        ) : (
          renameId !== c.id && (
            <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <button
                type="button"
                aria-label={c.saved ? 'הסר משיחות שמורות' : 'שמור שיחה'}
                title={c.saved ? 'הסר משיחות שמורות' : 'שמור שיחה'}
                onClick={() => toggleSaved(c.id)}
                className={`h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition ${
                  c.saved
                    ? 'flex text-amber-400 hover:text-amber-500'
                    : 'hidden text-slate-400 hover:text-amber-400 group-hover:flex'
                }`}
              >
                <Star size={12} variant={c.saved ? 'Bold' : 'Linear'} color="currentColor" />
              </button>
              <button
                type="button"
                aria-label="שינוי שם"
                onClick={() => {
                  setRenameId(c.id)
                  setRenameText(c.title)
                }}
                className="hidden h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition hover:text-[#2563EB] group-hover:flex"
              >
                <Edit2 size={12} color="currentColor" />
              </button>
              <button
                type="button"
                aria-label="מחיקת שיחה"
                onClick={() => setConfirmDeleteId(c.id)}
                className="hidden h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition hover:text-red-500 group-hover:flex"
              >
                <Trash size={12} color="currentColor" />
              </button>
            </div>
          )
        )}
      </div>
    )
  }

  const showHeroState = !active || active.messages.length === 0

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-slate-50">
      {/* ── Futuristic AI Mesh Gradient Background (Pure Smooth Ambient Glow) ── */}
      <div className="pointer-events-none absolute inset-0 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/90 via-slate-50 to-blue-50/70" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[750px] w-[1000px] rounded-full bg-gradient-to-tr from-[#2563EB]/22 via-[#38B6FF]/25 to-indigo-300/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-b from-[#38B6FF]/18 via-blue-400/15 to-[#2563EB]/15 blur-[110px]" />

      {/* 1. Sidebar Column (Right Side in RTL, Flex Flow) */}
      <aside className="hidden lg:block shrink-0 z-20 p-3.5 w-72 md:w-80 h-full">
        {sidebarContent}
      </aside>

      {/* 2. Chat Area Column (Fills remaining width, 100% centered inside its own bounds) */}
      <section className="flex flex-1 flex-col items-center justify-between min-w-0 h-full relative z-10 w-full px-3 sm:px-6 md:px-8 py-3 md:py-4">
        {/* Floating Mobile Conversation History Pill Button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden absolute top-3 right-4 z-30 flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-[12px] font-extrabold text-slate-700 shadow-md backdrop-blur-md transition hover:bg-white hover:text-[#2563EB] cursor-pointer"
        >
          <Messages3 size={16} color="#2563EB" variant="Bold" />
          <span>שיחות קודמות</span>
        </button>

        {/* Scrollable Conversation Content — Centered inside Chat Area Column */}
        <div ref={scrollRef} className="no-scrollbar flex-1 w-full overflow-y-auto flex flex-col items-center justify-center max-w-[840px] mx-auto py-4">
          {showHeroState ? (
            /* Welcome Hero View — Compact, tightly-coupled hero group */
            <div className="flex flex-col items-center justify-center w-full mx-auto text-center gap-6 my-auto">
              {/* Central Greeting Header */}
              <div className="flex flex-col items-center justify-center text-center shrink-0 w-full mx-auto">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#38B6FF] opacity-30 blur-xl animate-pulse" />
                  <IridescentOrb />
                </div>

                <h1 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                  שלום, במה אוכל{' '}
                  <span className="bg-gradient-to-r from-[#2563EB] via-[#38B6FF] to-blue-600 bg-clip-text text-transparent">
                    לסייע לך היום?
                  </span>
                </h1>
                <p className="mt-2 text-xs sm:text-sm md:text-base font-semibold text-slate-500 max-w-[540px] px-2 leading-relaxed">
                  חפש דירות, שאל שאלות או בקש ניתוח שוק והשוואת מחירים בשפה חופשית
                </p>

                {/* Quick Chips suggestions */}
                <div className="mt-4 flex flex-wrap justify-center gap-2 px-2 w-full max-w-[680px] mx-auto">
                  {CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => guardedSend(chip)}
                      className="rounded-full border border-slate-200/90 bg-white/90 px-4 py-1.5 text-[12px] sm:text-[13px] font-extrabold text-slate-700 shadow-xs backdrop-blur-md transition-all hover:border-blue-400 hover:bg-white hover:text-[#2563EB] hover:shadow-md cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Large & Prominent Chatbox Input Section */}
              <div className="w-full max-w-[840px] mx-auto mt-auto shrink-0 pt-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    guardedSend(input)
                  }}
                  className="relative rounded-3xl border-2 border-blue-200/90 bg-white p-3 sm:p-4 md:p-5 shadow-[0_20px_50px_rgba(37,99,235,0.12)] backdrop-blur-2xl transition-all duration-200 focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-blue-100"
                >
                  {/* Single/Multi line Prompt Text Input Row */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                      <MagicStar size={22} variant="Bold" color="#2563EB" />
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          guardedSend(input)
                        }
                      }}
                      rows={1}
                      placeholder="איזו דירה נחפש היום? (או שאל כל דבר על מחירים, חוזים, אזורים...)"
                      className="w-full resize-none bg-transparent text-[15px] sm:text-[16px] md:text-[17px] font-medium text-slate-900 outline-none placeholder:text-slate-400/90 leading-relaxed py-2 min-h-[44px] max-h-[140px]"
                    />
                    <UserSendButton
                      disabled={!input.trim()}
                      onClick={() => guardedSend(input)}
                    />
                  </div>

                  {/* Horizontal Scrollable Feature Pills — only pills that trigger a real search */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                    <button
                      type="button"
                      onClick={() => guardedSend('סנן דירות שמתאימות לסגנון החיים וההרגלים שלי')}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-[12px] font-extrabold text-slate-700 transition hover:border-[#2563EB] hover:bg-blue-50/50 hover:text-[#2563EB] cursor-pointer"
                    >
                      <Magicpen size={14} color="#2563EB" variant="Bold" />
                      <span>סינון סגנון חיים</span>
                    </button>
                  </div>
                </form>
                {showAuthHint && !isRegistered && (
                  <p className="mt-2 text-center text-[11.5px] font-semibold text-secondary-text">
                    כדי שאתי תענה צריך להתחבר קודם (בחינם, אותו חשבון כמו באפליקציה) — לחצו על שלח שוב כדי להתחבר.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Active Conversation View */
            <div className="w-full max-w-[800px] mx-auto space-y-5 pb-32">
              {active.messages.map((m, i) => {
                const listings = m.listingIds?.length ? resolveListings(m.listingIds) : []
                return (
                  <div key={m.id ?? i} className="flex flex-col w-full">
                    {m.role === 'user' ? (
                      <div className="max-w-[82%] sm:max-w-[75%] self-end rounded-2xl rounded-tr-sm bg-gradient-to-r from-[#2563EB] to-[#38B6FF] px-4 py-3 text-[14.5px] font-medium leading-relaxed text-white shadow-md my-1">
                        {m.text}
                      </div>
                    ) : (
                      <div className="flex w-full max-w-[90%] self-start items-start gap-3 my-1">
                        <AtiAvatar size={34} />
                        <div className="min-w-0 flex-1">
                          {m.deep && (
                            <p className="mb-1 text-[11px] font-black text-[#2563EB]">
                              מותאם אישית ✨
                            </p>
                          )}
                          <div className="max-w-[700px] whitespace-pre-line rounded-2xl rounded-tl-sm border border-slate-200/90 bg-white/95 backdrop-blur-md px-4.5 py-3 text-[14.5px] font-medium leading-relaxed text-slate-800 shadow-xs">
                            {m.text}
                            {m.why && (
                              <span className="mt-2 block text-[12px] font-semibold leading-relaxed text-slate-500 border-t border-slate-100 pt-1.5">
                                💡 {m.why}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Listing Cards Carousel */}
                    {listings.length > 0 && (
                      <div className="mt-3 w-full">
                        <ListingCarousel
                          listings={listings}
                          notes={m.notes}
                          explanations={m.explanations}
                        />
                      </div>
                    )}

                    {/* Quick Response Chips */}
                    {m.role === 'ati' && (m.chips?.length ?? 0) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 pe-10">
                        {m.chips!.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => onChipTap(chip)}
                            className="cursor-pointer rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-slate-700 shadow-sm transition hover:border-[#2563EB] hover:text-[#2563EB]"
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
                <div className="flex items-center gap-2.5 self-start ps-1">
                  <AtiAvatar size={28} />
                  <span className="animate-pulse text-[12.5px] font-bold text-[#2563EB]">
                    אתי מעמיקה… מדייקת את התוצאות בשבילך ✨
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Bottom Input Bar for Active Chat */}
        {!showHeroState && (
          <div className="absolute bottom-4 left-4 right-4 md:left-8 md:right-8 z-30 flex justify-center">
            <div className="w-full max-w-[800px]">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  guardedSend(input)
                }}
                className="flex items-center gap-3 rounded-3xl border-2 border-blue-200/90 bg-white/95 p-3 ps-5 shadow-[0_20px_50px_rgba(37,99,235,0.12)] backdrop-blur-2xl transition focus-within:border-[#2563EB]"
              >
                <MagicStar size={22} variant="Bold" color="#2563EB" className="shrink-0" />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="הקלד הודעה..."
                  className="min-w-0 flex-1 bg-transparent text-[15px] md:text-[16px] font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />

                {/* Real Web-Speech voice input — fills the composer with the transcript */}
                {hasMic && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition cursor-pointer ${
                        listening
                          ? 'animate-pulse border-[#2563EB] bg-[#2563EB] text-white'
                          : 'border-slate-200/90 bg-slate-50/90 text-slate-600 hover:border-[#2563EB] hover:bg-blue-50/80 hover:text-[#2563EB]'
                      }`}
                      title={listening ? 'מקשיבה…' : 'דיבור'}
                      aria-label="הקלטה קולית לאתי"
                    >
                      <Microphone2 size={19} variant={listening ? 'Bold' : 'Linear'} color="currentColor" />
                    </button>
                  </div>
                )}

                <UserSendButton
                  disabled={!input.trim()}
                  onClick={() => guardedSend(input)}
                />
              </form>
              {showAuthHint && !isRegistered && (
                <p className="mt-2 rounded-full bg-white/95 px-3 py-1 text-center text-[11.5px] font-semibold text-secondary-text shadow-sm backdrop-blur-xl">
                  כדי שאתי תענה צריך להתחבר קודם (בחינם, אותו חשבון כמו באפליקציה) — לחצו על שלח שוב כדי להתחבר.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Mobile Slide-over Drawer for Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 flex max-w-[85vw] shadow-2xl p-2">
            {sidebarContent}
          </div>
        </div>
      )}
    </div>
  )
}
