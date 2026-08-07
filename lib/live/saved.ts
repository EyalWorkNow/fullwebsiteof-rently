'use client'

// Saved (favorited) properties — the heart button on PropertyCard used to be
// pure component state: not even persisted across a page reload, let alone
// synced anywhere. Same backend contract the app now uses (dating_provider.dart
// toggleSave → POST /interactions {action: save/unsave}, GET /interactions/saved).
//
// One shared fetch for the whole page (not one GET per card): every
// PropertyCard mount calls ensureLoaded(), which coalesces into a single
// in-flight request and a module-level cache, same dedup shape as
// AwsApiClient's on the app side.

import { getToken } from './firebase'

const BASE = '/api/rently'

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

let cache: Set<string> | null = null
let inflight: Promise<Set<string>> | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

/** Subscribes to cache updates (e.g. after ensureLoaded resolves, or a toggle). */
export function onSavedChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Synchronous read of whatever's cached so far (empty before the first load). */
export function isSavedCached(propertyId: string): boolean {
  return cache?.has(propertyId) ?? false
}

/** Loads the caller's saved ids once per page (coalesced), then caches them. */
export async function ensureLoaded(): Promise<Set<string>> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch(`${BASE}/interactions/saved`, { headers: await authHeaders() })
      const data = res.ok ? await res.json().catch(() => null) : null
      const ids: string[] = Array.isArray(data?.propertyIds) ? data.propertyIds : []
      cache = new Set(ids)
    } catch {
      cache = new Set()
    }
    inflight = null
    emit()
    return cache
  })()
  return inflight
}

/** Optimistic toggle: updates the cache immediately, fires the request, never throws. */
export function toggleSaved(propertyId: string, saved: boolean): void {
  if (!cache) cache = new Set()
  if (saved) cache.add(propertyId)
  else cache.delete(propertyId)
  emit()
  void (async () => {
    try {
      await fetch(`${BASE}/interactions`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ propertyId, action: saved ? 'save' : 'unsave' }),
      })
    } catch {
      /* fail-soft — next ensureLoaded() reconciles from the server */
    }
  })()
}
