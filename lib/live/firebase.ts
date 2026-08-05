'use client'

import { initializeApp, getApps } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'

// Same Firebase project as the app. Public client config values (safe to embed).
const firebaseConfig = {
  apiKey: 'AIzaSyCDcwTR549WF4TG-Uezjrpa8oB9y7cO2-M',
  authDomain: 'mydatingapp-4c043.firebaseapp.com',
  projectId: 'mydatingapp-4c043',
  storageBucket: 'mydatingapp-4c043.firebasestorage.app',
  messagingSenderId: '116035400248',
  appId: '1:116035400248:android:fb47a8335ace11f2bdaccd',
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
  const manual = typeof window !== 'undefined' ? localStorage.getItem('rently_token') : null
  if (manual) return manual
  const u = cachedUser ?? (await ensureAuth())
  if (!u) return null
  try {
    return await u.getIdToken()
  } catch {
    return null
  }
}
