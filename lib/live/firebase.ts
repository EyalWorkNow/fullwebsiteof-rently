'use client'

import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type User,
} from 'firebase/auth'

// Same Firebase project as the app, but the project's WEB app registration —
// the site previously reused the ANDROID appId, which is the wrong client for
// browser OAuth. Public client config values (safe to embed).
const firebaseConfig = {
  apiKey: 'AIzaSyDRxWwbIw0x-pv-8HAtfo3n0RSgK3mdJbM',
  authDomain: 'mydatingapp-4c043.firebaseapp.com',
  projectId: 'mydatingapp-4c043',
  storageBucket: 'mydatingapp-4c043.firebasestorage.app',
  messagingSenderId: '116035400248',
  appId: '1:116035400248:web:c0746d447f77ea33bdaccd',
  measurementId: 'G-H6P0KRW0D7',
}

const app = getApps()[0] ?? initializeApp(firebaseConfig)
export const auth = getAuth(app)

let cachedUser: User | null = null

// Best-effort anonymous sign-in so listing fetches carry a Firebase ID token.
// If anonymous auth is disabled the promise resolves null and callers fall back
// to sample data.
export async function ensureAuth(): Promise<User | null> {
  if (cachedUser) return cachedUser
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        cachedUser = u
        resolve(u)
      }
    })
    signInAnonymously(auth).catch((e) => {
      console.warn('[firebase] anonymous sign-in failed:', e?.code || e)
      resolve(null)
    })
  })
}

export async function getToken(): Promise<string | null> {
  // Previously checked localStorage['rently_token'] first and, if present,
  // returned it verbatim as if it were a real Firebase ID token — bypassing
  // getIdToken() entirely. Nothing in this codebase ever set that key (it
  // was a dev-only escape hatch), but anyone with devtools access could set
  // it to an arbitrary string and every API call would send it as the
  // Bearer token. Removed — always mint a real, verifiable token.
  const u = cachedUser ?? (await ensureAuth())
  if (!u) return null
  try {
    return await u.getIdToken()
  } catch {
    return null
  }
}

// ── Real sign-in for the landlord portal — same Firebase project as the app,
// so a Google account signed in here gets the SAME uid as in the mobile app
// (that's what makes listings/calendar truly synced). Falls back to anon.
// Last failure code, so the UI can say something specific instead of a generic
// "it didn't work" (the code is otherwise swallowed and invisible to the user).
let lastAuthError: string | null = null
export function lastAuthErrorCode(): string | null {
  return lastAuthError
}

// Popup failures that are about the BROWSER, not the credentials — a redirect
// completes the same sign-in without a popup. Covers blocked popups, Chrome's
// COOP isolation breaking the popup handshake, and embedded webviews.
const REDIRECTABLE = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
  'auth/internal-error',
])

export async function signInWithGoogle(): Promise<User | null> {
  lastAuthError = null
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    const res = await signInWithPopup(auth, provider)
    cachedUser = res.user
    return res.user
  } catch (e) {
    const code = (e as { code?: string })?.code ?? 'unknown'
    lastAuthError = code
    console.warn('[firebase] popup sign-in failed:', code, e)
    if (REDIRECTABLE.has(code)) {
      try {
        // Navigates away; the result is picked up by completeRedirectSignIn()
        // on the way back, so this call never resolves with a user.
        await signInWithRedirect(auth, provider)
        return null
      } catch (e2) {
        lastAuthError = (e2 as { code?: string })?.code ?? code
        console.warn('[firebase] redirect sign-in failed:', lastAuthError, e2)
      }
    }
    return null
  }
}

// Email/password — the website previously offered Google only, so a user who
// registered with email/password IN THE APP had no way to reach that same
// account here (they'd either be stuck, or create a second, unrelated
// Google-based account that a human would assume is "the same person" but is
// actually a different Firebase uid). Same project as the app, so this signs
// into/creates the identical account the app's own email/password flow uses.
export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  lastAuthError = null
  try {
    const res = await signInWithEmailAndPassword(auth, email, password)
    cachedUser = res.user
    return res.user
  } catch (e) {
    lastAuthError = (e as { code?: string })?.code ?? 'unknown'
    console.warn('[firebase] email sign-in failed:', lastAuthError, e)
    return null
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<User | null> {
  lastAuthError = null
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password)
    cachedUser = res.user
    return res.user
  } catch (e) {
    lastAuthError = (e as { code?: string })?.code ?? 'unknown'
    console.warn('[firebase] email sign-up failed:', lastAuthError, e)
    return null
  }
}

/** Completes a redirect sign-in after the browser comes back. Safe to call always. */
export async function completeRedirectSignIn(): Promise<User | null> {
  try {
    const res = await getRedirectResult(auth)
    if (res?.user) {
      cachedUser = res.user
      return res.user
    }
  } catch (e) {
    console.warn('[firebase] redirect result failed:', (e as { code?: string })?.code || e)
  }
  return null
}

export async function signOut(): Promise<void> {
  cachedUser = null
  await fbSignOut(auth)
}

export function currentUser(): User | null {
  return cachedUser
}

// Subscribe to auth changes (returns unsubscribe). Keeps cachedUser fresh.
export function onUser(cb: (u: User | null) => void): () => void {
  return onAuthStateChanged(auth, (u) => {
    cachedUser = u
    cb(u)
  })
}
