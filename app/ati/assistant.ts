'use client'

// אתי page — multi-turn backend call (POST /assistant, mode 'tenant_search').
// Follows the lib/live/api.ts pattern, but sends the conversation history
// (last 10 turns) instead of a single query, and aborts after 12s so the
// instant local answer is never blocked on the network.

import { getToken } from '@/lib/live/firebase'
import type { ChatTurn, Property } from '@/lib/live/types'

const BASE = '/api/rently'
const TIMEOUT_MS = 12_000

function coerceList<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[]
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export interface DeepSearchResult {
  reply: string
  listings: Property[]
}

/** Backend "מעמיקה" pass. Returns null on any failure/timeout/empty reply —
 *  callers silently skip in that case. */
export async function deepAssistantSearch(turns: ChatTurn[]): Promise<DeepSearchResult | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const token = await getToken()
    const res = await fetch(`${BASE}/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages: turns.slice(-10), mode: 'tenant_search' }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    const reply: string = data.reply ?? data.data?.reply ?? ''
    if (!reply.trim()) return null
    const rawListings = data.listings ?? data.results ?? data.data?.listings ?? []
    const listings: Property[] = (Array.isArray(rawListings) ? rawListings : [])
      .filter((p: Property) => p && p.id)
      .map((p: Property) => ({
        ...p,
        media: coerceList(p.media),
        imageUrls: coerceList(p.imageUrls),
        smartTags: coerceList(p.smartTags),
      }))
    return { reply: reply.trim(), listings }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
