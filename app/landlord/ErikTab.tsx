'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Microphone2, Send2, TickCircle, VolumeHigh, VolumeSlash } from 'iconsax-react'
import { currentUser } from '@/lib/live/firebase'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import type { ChatTurn } from '@/lib/live/types'
import {
  draftToFields,
  erikChat,
  publishProperty,
  type DraftFields,
} from './portal-api'

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

interface Msg {
  role: 'user' | 'assistant'
  text: string
  draft?: Record<string, unknown> | null
  welcome?: boolean
}

const WELCOME =
  'שלום! אני אריק, העוזר האישי שלך. ספר לי על הדירה — עיר, רחוב, כמה חדרים ומה המחיר — ואני אכין טיוטת מודעה מוכנה לפרסום.'

// A visitor may READ אריק's opening message freely — the gate fires only when
// they actually talk to him or publish.
const CHAT_REASON = 'כדי שאריק ישמור את הטיוטה של הדירה שלך'
const PUBLISH_REASON = 'כדי לפרסם דירה ולנהל אותה'

export default function ErikTab() {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', text: WELCOME, welcome: true }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(false)
  const [hasMic, setHasMic] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string; id?: string } | null>(null)

  const { requireAuth } = useAuthGate()
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const speakRepliesRef = useRef(speakReplies)
  speakRepliesRef.current = speakReplies

  useEffect(() => {
    setHasMic(!!getSpeechRecognition())
    return () => {
      recRef.current?.abort()
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setInput('')
    setBusy(true)
    const next: Msg[] = [...messages, { role: 'user', text: trimmed }]
    setMessages(next)
    try {
      // Same history the app sends: real turns only, welcome excluded, last 12.
      const history: ChatTurn[] = next
        .filter((m) => !m.welcome && m.text.trim())
        .map((m) => ({ role: m.role, text: m.text }))
      const reply = await erikChat(history)
      setMessages((cur) => [
        ...cur,
        { role: 'assistant', text: reply.reply, draft: reply.propertyDraft },
      ])
      if (speakRepliesRef.current && reply.reply) speakHebrew(reply.reply)
    } catch (e) {
      setMessages((cur) => [
        ...cur,
        { role: 'assistant', text: (e as Error).message || 'משהו השתבש. נסו שוב.' },
      ])
    } finally {
      setBusy(false)
    }
  }

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
        void send(transcript)
      }
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  // ── Registration gate — only on the actions, never on reading the thread ───
  // The message the landlord typed is kept and sent for them right after they
  // sign in (requireAuth resumes the pending action).
  const sendRef = useRef(send)
  sendRef.current = send

  function guardedSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    requireAuth(CHAT_REASON, () => void sendRef.current(trimmed))
  }

  function guardedMic() {
    // Stopping an active recording is not a new action.
    if (listening) {
      toggleMic()
      return
    }
    requireAuth(CHAT_REASON, toggleMic)
  }

  return (
    <div className="max-w-[720px] mx-auto">
      {/* Thread */}
      <div className="flex flex-col gap-3 min-h-[300px]">
        {messages.map((m, i) => (
          <div key={i}>
            <MessageBubble msg={m} />
            {m.draft && (
              <DraftCard
                draft={m.draft}
                onPublished={(id) => {
                  setToast({ ok: true, text: 'הדירה פורסמה! תופיע גם באפליקציה', id })
                  setMessages((cur) => cur.map((mm) => (mm === m ? { ...mm, draft: null } : mm)))
                }}
                onError={(text) => setToast({ ok: false, text })}
              />
            )}
          </div>
        ))}
        {busy && (
          <div className="flex items-start gap-2">
            <ErikAvatar />
            <div className="bg-cloud rounded-2xl rounded-tr-sm px-4 py-3 flex gap-1.5 items-center">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="w-2 h-2 rounded-full bg-secondary-text/50 animate-bounce"
                  style={{ animationDelay: `${d * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <div className="sticky bottom-4 mt-5 bg-white border border-border-app rounded-full card-shadow flex items-center gap-1 ps-2 pe-2 py-1.5">
        <button
          onClick={() => setSpeakReplies((v) => !v)}
          title={speakReplies ? 'הקראת תשובות: פועל' : 'הקראת תשובות: כבוי'}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
            speakReplies ? 'bg-primary-light2 text-primary' : 'text-secondary-text hover:bg-cloud'
          }`}
        >
          {speakReplies ? (
            <VolumeHigh size={20} variant="Bold" color="currentColor" />
          ) : (
            <VolumeSlash size={20} variant="Linear" color="currentColor" />
          )}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && guardedSend(input)}
          placeholder={listening ? 'מקשיבה…' : 'ספרו לאריק על הדירה…'}
          className="flex-1 bg-transparent outline-none text-navy placeholder:text-secondary-text/70 px-2 min-w-0"
          dir="rtl"
        />
        {hasMic && (
          <button
            onClick={guardedMic}
            title="דיבור"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              listening ? 'bg-coral text-white animate-pulse' : 'text-secondary-text hover:bg-cloud'
            }`}
          >
            <Microphone2 size={20} variant={listening ? 'Bold' : 'Linear'} color="currentColor" />
          </button>
        )}
        <button
          onClick={() => guardedSend(input)}
          disabled={busy || !input.trim()}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 shrink-0"
        >
          <Send2 size={19} variant="Bold" color="currentColor" />
        </button>
      </div>
      {listening && (
        <p className="text-coral text-xs font-bold text-center mt-2 animate-pulse">מקשיבה…</p>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 inset-x-0 mx-auto w-fit max-w-[90vw] z-50 rounded-full px-5 py-3 text-white text-sm font-bold shadow-lg flex items-center gap-2 ${
            toast.ok ? 'bg-success' : 'bg-coral'
          }`}
        >
          {toast.ok && <TickCircle size={18} variant="Bold" color="currentColor" />}
          <span>{toast.text}</span>
          {toast.ok && toast.id && (
            <Link href={`/listing/${toast.id}`} className="underline whitespace-nowrap">
              לצפייה בדירה
            </Link>
          )}
          <button onClick={() => setToast(null)} className="ms-1 opacity-80">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

function ErikAvatar() {
  return (
    <span className="w-9 h-9 rounded-full bg-navy-deep text-white font-black flex items-center justify-center shrink-0 text-sm">
      ע
    </span>
  )
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-start flex-row-reverse">
        <div className="bg-primary-light2 text-navy rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%] whitespace-pre-wrap leading-relaxed">
          {msg.text}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2">
      <ErikAvatar />
      <div className="bg-cloud text-navy rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] whitespace-pre-wrap leading-relaxed">
        {msg.text}
      </div>
    </div>
  )
}

// ── Draft card ────────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  onPublished,
  onError,
}: {
  draft: Record<string, unknown>
  onPublished: (id: string) => void
  onError: (text: string) => void
}) {
  const [fields, setFields] = useState<DraftFields>(() => draftToFields(draft))
  const [publishing, setPublishing] = useState(false)
  const { requireAuth } = useAuthGate()

  const set = (k: keyof DraftFields) => (v: string) => setFields((f) => ({ ...f, [k]: v }))

  async function publish() {
    if (publishing) return
    // Read the account at publish time — after a gate sign-in this is the fresh
    // (non-anonymous) user, whose uid must own the listing.
    const u = currentUser()
    if (!u || u.isAnonymous) {
      onError('צריך להתחבר כדי לפרסם דירה.')
      return
    }
    setPublishing(true)
    try {
      const { id } = await publishProperty(fields, u.uid, u.displayName ?? '')
      onPublished(id)
    } catch (e) {
      onError((e as Error).message || 'הפרסום נכשל. נסו שוב.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="bg-white rounded-[28px] border border-primary/30 card-shadow p-5 mt-3 me-11">
      <div className="font-black text-navy mb-4">טיוטת מודעה מוכנה — אפשר לערוך ולפרסם</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="עיר" value={fields.city} onChange={set('city')} />
        <Field label="רחוב" value={fields.street} onChange={set('street')} />
        <Field label="מספר" value={fields.streetNumber} onChange={set('streetNumber')} inputMode="numeric" />
        <Field label="חדרים" value={fields.rooms} onChange={set('rooms')} inputMode="decimal" />
        <Field label='מ"ר' value={fields.sizeM2} onChange={set('sizeM2')} inputMode="numeric" />
        <Field label="קומה" value={fields.floor} onChange={set('floor')} />
        <Field label="מחיר (₪)" value={fields.price} onChange={set('price')} inputMode="numeric" />
        <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text">
          סוג עסקה
          <select
            value={fields.transactionType}
            onChange={(e) => set('transactionType')(e.target.value)}
            className="border border-border-app rounded-xl px-3 py-2 text-sm text-navy bg-white outline-none focus:border-primary"
          >
            <option value="rent">השכרה</option>
            <option value="sale">מכירה</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text mt-3">
        תיאור
        <textarea
          value={fields.description}
          onChange={(e) => set('description')(e.target.value)}
          rows={3}
          className="border border-border-app rounded-xl px-3 py-2 text-sm text-navy outline-none focus:border-primary resize-y"
        />
      </label>
      <button
        onClick={() => requireAuth(PUBLISH_REASON, () => void publish())}
        disabled={publishing}
        className="mt-4 w-full bg-primary hover:bg-primary-dark transition-colors text-white font-bold rounded-full py-3 disabled:opacity-60"
      >
        {publishing ? 'מפרסמים…' : 'פרסום הדירה'}
      </button>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  inputMode?: 'numeric' | 'decimal'
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text">
      {label}
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="border border-border-app rounded-xl px-3 py-2 text-sm text-navy outline-none focus:border-primary min-w-0"
      />
    </label>
  )
}
