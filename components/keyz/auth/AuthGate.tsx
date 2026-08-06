'use client'

// Action-triggered registration gate.
//
// Browsing is ALWAYS open. The sign-up modal appears only when a visitor tries
// to COMPLETE a meaningful action (send a message to אתי, talk to אריק, publish
// a flat…). Never on page load, never as a wall in front of content.
//
// IMPORTANT: the site signs every visitor in ANONYMOUSLY so listing fetches
// carry a Firebase ID token. "Registered" therefore means a NON-anonymous user
// (`user && !user.isAnonymous`) — never merely "there is a firebase user".
//
// Provider-free by design: a tiny module-level store (useSyncExternalStore) is
// shared by every call site, and the modal itself is rendered ONCE from
// app/layout.tsx via <AuthGateModal />.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { CloseCircle } from 'iconsax-react'
import type { User } from 'firebase/auth'
import {
  completeRedirectSignIn,
  currentUser,
  lastAuthErrorCode,
  onUser,
  signInWithGoogle,
} from '@/lib/live/firebase'

// ── Auth store (one Firebase listener for the whole app) ─────────────────────

interface AuthSnapshot {
  user: User | null
  ready: boolean
}

const SIGNED_OUT: AuthSnapshot = { user: null, ready: false }
let authSnapshot: AuthSnapshot = SIGNED_OUT
let authWatching = false
const authListeners = new Set<() => void>()

function emitAuth() {
  for (const l of authListeners) l()
}

function subscribeAuth(listener: () => void): () => void {
  authListeners.add(listener)
  if (!authWatching && typeof window !== 'undefined') {
    authWatching = true
    // Finish a redirect sign-in (the popup fallback) before wiring the watcher,
    // otherwise the returning user looks signed-out for a beat.
    void completeRedirectSignIn()
    onUser((u) => {
      authSnapshot = { user: u, ready: true }
      emitAuth()
    })
  }
  return () => {
    authListeners.delete(listener)
  }
}

const getAuthSnapshot = () => authSnapshot
const getAuthServerSnapshot = () => SIGNED_OUT

/** The single source of truth for "did this visitor actually register?". */
export function isRegisteredUser(u: User | null | undefined): boolean {
  return !!u && !u.isAnonymous
}

// ── Gate store (which modal is open, and what to run after sign-in) ──────────

interface GateSnapshot {
  open: boolean
  reason: string
}

const CLOSED: GateSnapshot = { open: false, reason: '' }
let gateSnapshot: GateSnapshot = CLOSED
let pendingAction: (() => void) | null = null
let triggerEl: HTMLElement | null = null
const gateListeners = new Set<() => void>()

function emitGate() {
  for (const l of gateListeners) l()
}

function subscribeGate(listener: () => void): () => void {
  gateListeners.add(listener)
  return () => {
    gateListeners.delete(listener)
  }
}

const getGateSnapshot = () => gateSnapshot
const getGateServerSnapshot = () => CLOSED

function openGate(reason: string, action: (() => void) | null) {
  pendingAction = action
  triggerEl =
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  gateSnapshot = { open: true, reason }
  emitGate()
}

/** Closes without signing in — the pending action is dropped on purpose. */
function dismissGate() {
  pendingAction = null
  gateSnapshot = CLOSED
  emitGate()
  const el = triggerEl
  triggerEl = null
  if (el) setTimeout(() => el.focus?.(), 0)
}

/**
 * Closes and RESUMES the action the visitor was trying to complete — this is
 * what makes their message actually send after they register instead of being
 * silently lost.
 */
function resolveGate() {
  const action = pendingAction
  pendingAction = null
  triggerEl = null
  gateSnapshot = CLOSED
  emitGate()
  if (action) setTimeout(action, 0)
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface AuthGateApi {
  /** true only for a real (non-anonymous) account. */
  isRegistered: boolean
  user: User | null
  /** Runs `action` now when registered, otherwise opens the modal and runs it after sign-in. */
  requireAuth: (reason: string, action: () => void) => void
  /** Optional local instance of the modal (the app renders one in the layout). */
  modal: ReactNode
}

export function useAuthGate(): AuthGateApi {
  const { user } = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthServerSnapshot)
  const registered = isRegisteredUser(user)

  const requireAuth = useCallback((reason: string, action: () => void) => {
    // Read the freshest user straight from the auth module — a sign-in that
    // happened a tick ago must not cost the visitor an extra popup.
    if (isRegisteredUser(currentUser()) || isRegisteredUser(authSnapshot.user)) {
      action()
      return
    }
    openGate(reason, action)
  }, [])

  return { isRegistered: registered, user, requireAuth, modal: <AuthGateModal /> }
}

// ── Modal ────────────────────────────────────────────────────────────────────

// Only the first mounted instance renders, so an accidental second
// <AuthGateModal /> can never produce two dialogs.
let claimed: symbol | null = null

// Firebase error code -> something the visitor can act on.
const AUTH_ERROR_TEXT: Record<string, string> = {
  'auth/popup-blocked': 'הדפדפן חסם את חלון ההתחברות — אישרו חלונות קופצים ונסו שוב.',
  'auth/popup-closed-by-user': 'חלון ההתחברות נסגר לפני שהסתיים. נסו שוב.',
  'auth/cancelled-popup-request': 'ההתחברות בוטלה. נסו שוב.',
  'auth/network-request-failed': 'אין חיבור לרשת כרגע. בדקו את החיבור ונסו שוב.',
  'auth/unauthorized-domain': 'הכתובת הזו לא מאושרת בהגדרות ההתחברות של הפרויקט.',
  'auth/operation-not-allowed': 'התחברות עם Google לא מופעלת בפרויקט.',
}

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function AuthGateModal() {
  const { open, reason } = useSyncExternalStore(
    subscribeGate,
    getGateSnapshot,
    getGateServerSnapshot,
  )
  const idRef = useRef<symbol | null>(null)
  if (idRef.current === null) idRef.current = Symbol('auth-gate')

  const [owner, setOwner] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const signInRef = useRef<HTMLButtonElement>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = idRef.current!
    if (claimed === null) {
      claimed = id
      setOwner(true)
    }
    return () => {
      if (claimed === id) {
        claimed = null
        setOwner(false)
      }
    }
  }, [])

  const visible = owner && open

  // Escape closes; Tab is trapped inside the dialog.
  useEffect(() => {
    if (!visible) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissGate()
        return
      }
      if (e.key !== 'Tab') return
      const card = cardRef.current
      if (!card) return
      const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !card.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible])

  // Focus the sign-in button on open, and reset any previous error.
  useEffect(() => {
    if (!visible) return
    setError(null)
    setSigningIn(false)
    const t = setTimeout(() => signInRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [visible])

  if (!visible) return null

  async function handleGoogle() {
    setSigningIn(true)
    setError(null)
    const u = await signInWithGoogle()
    setSigningIn(false)
    if (isRegisteredUser(u)) resolveGate()
    else setError(lastAuthErrorCode() ?? 'unknown')
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="presentation"
    >
      <div
        aria-hidden
        onClick={dismissGate}
        className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-title"
        className="relative w-full max-w-[420px] rounded-[28px] border border-border-app bg-white p-7 text-center card-shadow"
      >
        <button
          type="button"
          aria-label="סגירה"
          onClick={dismissGate}
          className="absolute top-2.5 end-2.5 flex h-9 w-9 items-center justify-center text-secondary-text transition-colors hover:text-navy"
        >
          <CloseCircle size={22} color="currentColor" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Rently" className="mx-auto h-8 w-auto" />

        <h2 id="auth-gate-title" className="mt-5 text-2xl font-black text-navy">
          רגע לפני שנמשיך
        </h2>
        {reason && (
          <p className="mt-2 text-sm leading-relaxed text-secondary-text">{reason}</p>
        )}

        <button
          ref={signInRef}
          type="button"
          onClick={handleGoogle}
          disabled={signingIn}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-full border border-border-app bg-white px-5 py-3 font-bold text-navy transition-colors hover:border-primary/40 disabled:opacity-60"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border-app bg-cloud text-xs font-black text-primary">
            G
          </span>
          {signingIn ? 'מתחברים…' : 'התחברות עם Google'}
        </button>

        {error && (
          <p className="mt-3 text-sm text-coral">
            {AUTH_ERROR_TEXT[error] ?? 'ההתחברות לא הצליחה. נסו שוב.'}
          </p>
        )}

        <p className="mt-4 text-xs font-semibold text-secondary-text">
          בחינם · מתחברים עם אותו חשבון כמו באפליקציה
        </p>

        <button
          type="button"
          onClick={dismissGate}
          className="mt-4 text-[13px] font-bold text-secondary-text transition-colors hover:text-navy"
        >
          אמשיך לגלוש
        </button>
      </div>
    </div>
  )
}

export default AuthGateModal
