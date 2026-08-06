import { NextRequest, NextResponse } from 'next/server'

// Anti-scraping (app layer): every browser call to the backend goes through
// the same-origin /api/rently/* proxy (see next.config.ts rewrites), so this
// is the one chokepoint that sees every request regardless of which page or
// tab made it. Two independent limits:
//  - a general per-IP cap, loose enough that a real user's tab (which fires
//    a handful of calls per page) never notices it;
//  - a tighter cap on the listings feed specifically for callers with no
//    Authorization header — that's the highest-value bulk-scrape target
//    (the whole catalog), and a real user gets a Firebase token within a
//    request or two of loading the app, so "many anonymous hits in a row" is
//    close to a pure bot signature.
//
// ponytail: counters are an in-memory Map, so they reset per serverless
// instance/cold start and aren't shared across regions — this blunts a
// single IP hammering the API, not a distributed residential-proxy botnet.
// If that shows up, upgrade the store to Upstash/Redis (same interface,
// shared state) rather than rewriting this logic.
export const config = { matcher: ['/api/rently/:path*'] }

const WINDOW_MS = 60_000
const GENERAL_LIMIT = 120
const PROPERTIES_ANON_LIMIT = 20

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function hit(key: string, limit: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  bucket.count += 1
  return bucket.count <= limit
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

function tooManyRequests(): NextResponse {
  return new NextResponse(JSON.stringify({ message: 'Too many requests' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
  })
}

export function middleware(req: NextRequest): NextResponse {
  const ip = clientIp(req)

  if (!hit(`${ip}:general`, GENERAL_LIMIT)) {
    return tooManyRequests()
  }

  const isPropertiesFeed = req.nextUrl.pathname.startsWith('/api/rently/properties')
  const isAnonymous = !req.headers.get('authorization')
  if (isPropertiesFeed && isAnonymous && !hit(`${ip}:properties-anon`, PROPERTIES_ANON_LIMIT)) {
    return tooManyRequests()
  }

  return NextResponse.next()
}
