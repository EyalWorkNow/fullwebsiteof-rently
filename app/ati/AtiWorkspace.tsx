'use client'

// אתי on the web — Header removed, Hero chatbox raised up slightly,
// Real Rently app features included (אינטליגנציית אזור, השוואת מחירי שוק, סינון סגנון חיים, ניתוח חוזה שכירות),
// and Send button formatted with crisp SF Hebrew Rounded font.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Add,
  ChartSquare,
  DocumentText,
  Edit2,
  HambergerMenu,
  LampCharge,
  Location,
  Magicpen,
  MagicStar,
  Messages3,
  SearchNormal1,
  Star,
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
          <button className="uiverse" type="submit" disabled={disabled} onClick={disabled ? undefined : onClick}>
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
          className="rounded-[24px] bg-[#0061FF] px-5 py-2 text-[15px] font-bold text-white shadow-md"
          type="submit"
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
    --c-color-2: #0061FF;
    --c-color-3: #00D2FF;
    --c-color-4: rgba(0, 97, 255, 0.85);
    --c-shadow: rgba(0, 97, 255, 0.4);
    --c-shadow-inset-top: rgba(186, 230, 253, 0.9);
    --c-shadow-inset-bottom: rgba(0, 97, 255, 0.8);
    --c-radial-inner: #0061FF;
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

// ── USER COMPONENT 2: EXACT User 3D Industrial Toggle Switch ───────────────
interface UserSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

const Switch: React.FC<UserSwitchProps> = ({ checked, onChange }) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative inline-flex items-center justify-center shrink-0 w-[56px] h-[72px] overflow-visible">
      {mounted ? (
        <StyledWrapper>
          <label className="switch">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
            />
            <div className="button">
              <div className="light" />
              <div className="dots" />
              <div className="characters" />
              <div className="shine" />
              <div className="shadow" />
            </div>
          </label>
        </StyledWrapper>
      ) : (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0061FF]" />
        </label>
      )}
    </div>
  )
}

const StyledWrapper = styled.div`
  transform: scale(0.35);
  transform-origin: center center;
  position: absolute;

  .switch {
    display: block;
    background-color: black;
    width: 150px;
    height: 195px;
    box-shadow: 0 0 10px 2px rgba(0, 0, 0, 0.2), 0 0 1px 2px black, inset 0 2px 2px -2px white, inset 0 0 2px 15px #47434c, inset 0 0 2px 22px black;
    border-radius: 5px;
    padding: 20px;
    perspective: 700px;
  }

  .switch input {
    display: none;
  }

  .switch input:checked + .button {
    transform: translateZ(20px) rotateX(25deg);
    box-shadow: 0 -10px 20px #18ffec;
  }

  .switch input:checked + .button .light {
    animation: flicker 0.2s infinite 0.3s;
  }

  .switch input:checked + .button .shine {
    opacity: 1;
  }

  .switch input:checked + .button .shadow {
    opacity: 0;
  }

  .switch .button {
    display: block;
    transition: all 0.3s cubic-bezier(1, 0, 1, 1);
    transform-origin: center center -20px;
    transform: translateZ(20px) rotateX(-25deg);
    transform-style: preserve-3d;
    background-color: #06919b;
    height: 100%;
    position: relative;
    cursor: pointer;
    background: linear-gradient(#009890 0%, #006f6f 30%, #006b6f 70%, #009398 100%);
    background-repeat: no-repeat;
  }

  .switch .button::before {
    content: "";
    background: linear-gradient(rgba(255, 255, 255, 0.8) 10%, rgba(255, 255, 255, 0.3) 30%, #006265 75%, #002a32) 50% 50%/97% 97%, #00a5b1;
    background-repeat: no-repeat;
    width: 100%;
    height: 50px;
    transform-origin: top;
    transform: rotateX(-90deg);
    position: absolute;
    top: 0;
  }

  .switch .button::after {
    content: "";
    background-image: linear-gradient(#005665, #002832);
    width: 100%;
    height: 50px;
    transform-origin: top;
    transform: translateY(50px) rotateX(-90deg);
    position: absolute;
    bottom: 0;
    box-shadow: 0 50px 8px 0px black, 0 80px 20px 0px rgba(0, 0, 0, 0.5);
  }

  .switch .light {
    opacity: 0;
    animation: light-off 1s;
    position: absolute;
    width: 100%;
    height: 100%;
    background-image: radial-gradient(#7efff4, #18ffec 40%, transparent 70%);
  }

  .switch .dots {
    position: absolute;
    width: 100%;
    height: 100%;
    background-image: radial-gradient(transparent 30%, rgba(0, 101, 96, 0.7) 70%);
    background-size: 10px 10px;
  }

  .switch .characters {
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(white, white) 50% 20%/5% 20%, radial-gradient(circle, transparent 50%, white 52%, white 70%, transparent 72%) 50% 80%/33% 25%;
    background-repeat: no-repeat;
  }

  .switch .shine {
    transition: all 0.3s cubic-bezier(1, 0, 1, 1);
    opacity: 0.3;
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(white, transparent 3%) 50% 50%/97% 97%, linear-gradient(rgba(255, 255, 255, 0.5), transparent 50%, transparent 80%, rgba(255, 255, 255, 0.5)) 50% 50%/97% 97%;
    background-repeat: no-repeat;
  }

  .switch .shadow {
    transition: all 0.3s cubic-bezier(1, 0, 1, 1);
    opacity: 1;
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(transparent 70%, rgba(0, 0, 0, 0.8));
    background-repeat: no-repeat;
  }

  @keyframes flicker {
    0% {
      opacity: 1;
    }

    80% {
      opacity: 0.8;
    }

    100% {
      opacity: 1;
    }
  }

  @keyframes light-off {
    0% {
      opacity: 1;
    }

    80% {
      opacity: 0;
    }
  }
`

// 3D Iridescent Orb Graphic (Rently Blue Palette)
function IridescentOrb() {
  return (
    <div className="relative flex items-center justify-center my-4">
      <div className="absolute h-36 w-36 rounded-full bg-gradient-to-r from-[#38B6FF]/30 via-[#0061FF]/20 to-[#38B6FF]/30 blur-2xl animate-pulse" />
      <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-sky-200 via-blue-100 to-sky-300 p-0.5 shadow-[0_10px_35px_rgba(0,97,255,0.25)] transition-transform duration-700 hover:scale-105">
        <div className="h-full w-full rounded-full bg-gradient-to-br from-white/90 via-sky-50/70 to-blue-100/90 backdrop-blur-md relative overflow-hidden flex items-center justify-center">
          <div className="absolute -top-3 -left-3 h-10 w-10 rounded-full bg-white/80 blur-sm" />
          <div className="absolute bottom-1 right-2 h-7 w-7 rounded-full bg-sky-300/40 blur-md" />
          <div className="absolute top-4 right-3 h-4 w-4 rounded-full bg-blue-300/30 blur-sm" />
          <MagicStar size={32} variant="Bold" color="currentColor" className="text-[#0061FF] drop-shadow-sm relative z-10 animate-spin-slow" />
        </div>
      </div>
    </div>
  )
}

function AtiAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#0061FF] to-[#38B6FF] text-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <MagicStar size={Math.round(size * 0.55)} variant="Bold" color="currentColor" />
    </span>
  )
}

export default function AtiWorkspace() {
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

  const propsMapRef = useRef<Map<string, Property>>(new Map())
  const [, setPropsVersion] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const openerIdxRef = useRef(0)

  // ── Bootstrapping ──────────────────────────────────────────────────────────
  useEffect(() => {
    setConversations(loadConversations())
    const savedImm = loadImmediateMode()
    setImmediate(savedImm !== undefined ? savedImm : true)
    setLoaded(true)
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
      list = list.filter((c) => (c as AtiConversation & { saved?: boolean }).saved === true)
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0061FF] to-[#38B6FF] text-white shadow-md shrink-0">
              <MagicStar size={20} variant="Bold" color="currentColor" />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-[15px] font-black text-slate-900 leading-tight">Rently</span>
              <span className="block truncate text-[11px] font-bold text-[#0061FF]">אתי · העוזרת החכמה</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0061FF] to-[#38B6FF] text-white shadow-md shrink-0">
            <MagicStar size={20} variant="Bold" color="currentColor" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          aria-label={isSidebarCollapsed ? "הרחב סרגל צד" : "כווץ סרגל צד"}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#0061FF] transition shrink-0"
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0061FF] px-4 py-2.5 text-[13.5px] font-bold text-white shadow-md transition hover:bg-blue-700"
          >
            <Add size={18} color="currentColor" />
            <span>שיחה חדשה</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => createConversation('שיחה חדשה')}
            title="שיחה חדשה"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0061FF] text-white shadow-md transition hover:bg-blue-700"
          >
            <Add size={20} color="currentColor" />
          </button>
        )}
      </div>

      {/* Search Input in Sidebar */}
      {!isSidebarCollapsed ? (
        <div className="px-3 pb-2">
          <div className="relative flex items-center rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-1.5 focus-within:border-[#0061FF] focus-within:bg-white transition">
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
                    ? 'bg-blue-50/80 text-[#0061FF]'
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
                    ? 'bg-blue-50/80 text-[#0061FF]'
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
                  sidebarNavTab === 'recent' ? 'bg-blue-50 text-[#0061FF]' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Messages3 size={18} color="currentColor" />
              </button>
              <button
                type="button"
                title="שיחות שמורות"
                onClick={() => setSidebarNavTab('saved')}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                  sidebarNavTab === 'saved' ? 'bg-blue-50 text-[#0061FF]' : 'text-slate-500 hover:bg-slate-100'
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
                    ? 'bg-[#0061FF] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#0061FF]'
                }`}
              >
                {c.title.charAt(0) || 'ש'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Bottom Footer: Mode 3D Toggle Switch Panel */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70">
        {!isSidebarCollapsed ? (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <Switch
                checked={!immediate}
                onChange={(isPersonalized) => togglePersonalizedMode(isPersonalized)}
              />
            </div>

            {/* Rectangular Mode Badge with Smooth Animation */}
            <div className="flex-1 ms-2 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={immediate ? 'fast' : 'personalized'}
                  initial={{ opacity: 0, y: 5, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-center shadow-inner"
                >
                  <span className="block text-[12px] font-bold text-[#0061FF]">
                    {immediate ? 'מהיר' : 'מותאם אישית'}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Switch
              checked={!immediate}
              onChange={(isPersonalized) => togglePersonalizedMode(isPersonalized)}
            />
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
          isSelected ? 'bg-blue-50/90 text-[#0061FF] font-bold' : 'hover:bg-slate-100/70 text-slate-700'
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
              className="w-full rounded-lg border border-blue-300 bg-white px-2 py-1 text-[12.5px] font-medium text-slate-900 outline-none focus:ring-1 focus:ring-[#0061FF]"
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
            <div className="absolute end-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 group-hover:flex">
              <button
                type="button"
                aria-label="שינוי שם"
                onClick={() => {
                  setRenameId(c.id)
                  setRenameText(c.title)
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition hover:text-[#0061FF]"
              >
                <Edit2 size={12} color="currentColor" />
              </button>
              <button
                type="button"
                aria-label="מחיקת שיחה"
                onClick={() => setConfirmDeleteId(c.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition hover:text-red-500"
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
    <div className="relative flex h-full w-full overflow-hidden bg-gradient-to-b from-blue-50/50 via-slate-50/90 to-blue-50/40">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#38B6FF]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-40 h-[500px] w-[500px] rounded-full bg-[#0061FF]/15 blur-3xl" />

      {/* Floating Desktop Sidebar (Right Side in RTL) */}
      <aside className="hidden lg:block shrink-0 z-20 m-3.5">
        {sidebarContent}
      </aside>

      {/* Main Workspace Area */}
      <section className="flex flex-1 flex-col min-w-0 h-full relative z-10">
        {/* Floating Mobile Conversation History Pill Button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden absolute top-2 start-3 z-30 flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11.5px] font-bold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-[#0061FF]"
        >
          <Messages3 size={15} color="#0061FF" variant="Bold" />
          <span>שיחות קודמות</span>
        </button>

        {/* Scrollable Conversation Content */}
        <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-3 sm:px-4 md:px-8 py-2 md:py-4 flex flex-col">
          {showHeroState ? (
            /* Welcome Hero View — top greeting + bottom chatbox on mobile */
            <div className="flex-1 flex flex-col justify-between items-center max-w-[760px] w-full mx-auto text-center pt-6 pb-12 md:pt-10 md:pb-4 min-h-[calc(100dvh-110px)] md:min-h-0">
              {/* Central Greeting Header */}
              <div className="flex flex-col items-center my-auto md:my-0 py-2 shrink-0">
                <IridescentOrb />

                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                  שלום, במה אוכל{' '}
                  <span className="bg-gradient-to-r from-[#0061FF] via-[#38B6FF] to-blue-600 bg-clip-text text-transparent">
                    לסייע לך היום?
                  </span>
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-500 max-w-[480px] px-2">
                  חפש דירות, שאל שאלות או בקש ניתוח שוק והשוואת מחירים בשפה חופשית
                </p>

                {/* Quick Chips suggestions */}
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 px-2">
                  {CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => guardedSend(chip)}
                      className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11.5px] sm:text-[12px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm transition hover:border-blue-400 hover:bg-white hover:text-[#0061FF]"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Floating Prompt Card Container (Bottom Anchored on Mobile with Floating Button Clearance) */}
              <div className="w-full max-w-[680px] mt-auto shrink-0 pt-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    guardedSend(input)
                  }}
                  className="relative rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white/95 p-2.5 sm:p-3 md:p-4 shadow-[0_12px_36px_rgba(0,97,255,0.09)] backdrop-blur-xl transition focus-within:border-[#0061FF] focus-within:ring-2 focus-within:ring-blue-100"
                >
                  {/* Single/Multi line Prompt Text Input Row */}
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <MagicStar size={20} variant="Bold" color="#0061FF" className="shrink-0" />
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          guardedSend(input)
                        }
                      }}
                      rows={1}
                      placeholder="איזו דירה נחפש היום? (או שאל כל דבר)"
                      className="w-full resize-none bg-transparent text-[14px] sm:text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 leading-normal py-1.5 min-h-[36px] max-h-[120px]"
                    />
                    <UserSendButton
                      disabled={!input.trim()}
                      onClick={() => guardedSend(input)}
                    />
                  </div>

                  {/* Horizontal Scrollable Feature Pills */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    <button
                      type="button"
                      onClick={() => guardedSend('בצע ניתוח אינטליגנציית אזור על תחבורה, בתי ספר ושקט בסביבה')}
                      className="shrink-0 flex items-center gap-1 rounded-full border border-slate-200/70 bg-slate-50/80 px-2.5 py-1 text-[11.5px] font-bold text-slate-600 transition hover:border-blue-300 hover:bg-white hover:text-[#0061FF]"
                    >
                      <Location size={13} color="currentColor" />
                      <span>אינטליגנציית אזור</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => guardedSend('בצע השוואת מחירי שוק מול דירות דומות באזור')}
                      className="shrink-0 flex items-center gap-1 rounded-full border border-slate-200/70 bg-slate-50/80 px-2.5 py-1 text-[11.5px] font-bold text-slate-600 transition hover:border-blue-300 hover:bg-white hover:text-[#0061FF]"
                    >
                      <ChartSquare size={13} color="currentColor" />
                      <span>השוואת מחירי שוק</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => guardedSend('סנן דירות שמתאימות לסגנון החיים וההרגלים שלי')}
                      className="shrink-0 flex items-center gap-1 rounded-full border border-slate-200/70 bg-slate-50/80 px-2.5 py-1 text-[11.5px] font-bold text-slate-600 transition hover:border-blue-300 hover:bg-white hover:text-[#0061FF]"
                    >
                      <Magicpen size={13} color="currentColor" />
                      <span>סינון סגנון חיים</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => guardedSend('אני רוצה להתייעץ ולנתח חוזה שכירות')}
                      className="shrink-0 flex items-center gap-1 rounded-full border border-slate-200/70 bg-slate-50/80 px-2.5 py-1 text-[11.5px] font-bold text-slate-600 transition hover:border-blue-300 hover:bg-white hover:text-[#0061FF]"
                    >
                      <DocumentText size={13} color="currentColor" />
                      <span>בדיקת חוזים</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Active Conversation View */
            <div className="mx-auto max-w-[800px] space-y-6 pb-24">
              {active.messages.map((m, i) => {
                const listings = m.listingIds?.length ? resolveListings(m.listingIds) : []
                return (
                  <div key={m.id ?? i} className="flex flex-col">
                    {m.role === 'user' ? (
                      <div className="max-w-[82%] self-end rounded-2xl rounded-br-sm bg-gradient-to-r from-[#0061FF] to-[#38B6FF] px-4 py-3 text-[14.5px] font-medium leading-relaxed text-white shadow-md">
                        {m.text}
                      </div>
                    ) : (
                      <div className="flex max-w-full items-start gap-3 self-start">
                        <AtiAvatar size={36} />
                        <div className="min-w-0 flex-1">
                          {m.deep && (
                            <p className="mb-1 text-[11px] font-black text-[#0061FF]">
                              מותאם אישית ✨
                            </p>
                          )}
                          <div className="max-w-[620px] whitespace-pre-line rounded-2xl rounded-bl-sm border border-slate-200/80 bg-white px-4 py-3 text-[14.5px] font-medium leading-relaxed text-slate-800 shadow-sm">
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
                      <div className="no-scrollbar mt-3 flex snap-x gap-4 overflow-x-auto pb-2 ps-11">
                        {listings.map((p) => (
                          <div key={p.id} className="snap-start shrink-0">
                            <a href={`/listing/${p.id}`} className="block">
                              <PropertyCard property={p} />
                            </a>
                            {(m.notes?.[p.id] || m.explanations?.[p.id]) && (
                              <p className="mt-1.5 max-w-[280px] text-[11.5px] font-semibold leading-relaxed text-slate-500">
                                {m.notes?.[p.id] && (
                                  <span className="text-[#0061FF] font-bold">{m.notes[p.id]}</span>
                                )}
                                {m.notes?.[p.id] && m.explanations?.[p.id] ? ' · ' : ''}
                                {m.explanations?.[p.id]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Response Chips */}
                    {m.role === 'ati' && (m.chips?.length ?? 0) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 ps-11">
                        {m.chips!.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => onChipTap(chip)}
                            className="cursor-pointer rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-slate-700 shadow-sm transition hover:border-[#0061FF] hover:text-[#0061FF]"
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
                  <span className="animate-pulse text-[12.5px] font-bold text-[#0061FF]">
                    אתי מעמיקה… מדייקת את התוצאות בשבילך ✨
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Bottom Input Bar for Active Chat */}
        {!showHeroState && (
          <div className="absolute bottom-4 left-4 right-4 md:left-8 md:right-8 z-30">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                guardedSend(input)
              }}
              className="mx-auto max-w-[800px] flex items-center gap-2 rounded-2xl border border-white/95 bg-white/95 p-2 ps-4 shadow-[0_15px_35px_rgba(0,97,255,0.09)] backdrop-blur-xl"
            >
              <MagicStar size={20} variant="Bold" color="currentColor" className="text-[#0061FF] shrink-0" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="הקלד הודעה..."
                className="min-w-0 flex-1 bg-transparent text-[14.5px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
              />
              <UserSendButton
                disabled={!input.trim()}
                onClick={() => guardedSend(input)}
              />
            </form>
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
          <div className="absolute inset-y-0 end-0 flex max-w-[85vw] shadow-2xl p-2">
            {sidebarContent}
          </div>
        </div>
      )}
    </div>
  )
}
