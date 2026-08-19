import { NextRequest, NextResponse } from 'next/server'

// Anti-scraping (app layer): every browser call to the backend goes through
// the same-origin /api/rently/* proxy (see next.config.ts rewrites), so this
// is the one chokepoint that sees every request regardless of which page or
// tab made it. Two independent limits:
//  - a general cap, loose enough that a real user's tab (which fires a
//    handful of calls per page, plus a live chat thread polling every 5s)
//    never notices it;
//  - a tighter cap on the listings feed specifically for callers with no
//    Authorization header — that's the highest-value bulk-scrape target
//    (the whole catalog), and a real user gets a Firebase token within a
//    request or two of loading the app, so "many anonymous hits in a row" is
//    close to a pure bot signature.
//
// The general bucket is keyed by the caller's TOKEN when one is present, not
// by IP — keying by IP alone meant every signed-in visitor behind the same
// mobile-carrier CGNAT / office NAT (extremely common) shared ONE 120/min
// budget with every other stranger on that network. A handful of unrelated
// people each with an open chat thread (12 req/min apiece just from polling)
// could exhaust the shared bucket, and every subsequent request from anyone
// on that IP — including the person who did nothing wrong — got a 429. That
// surfaced as listings/chat/matches silently breaking mid-session, which
// read to users as "the site threw me out." Falls back to IP only for
// genuinely anonymous (no-token) traffic, where IP is the only signal we have.
//
// ponytail: counters are an in-memory Map, so they reset per serverless
// instance/cold start and aren't shared across regions — this blunts a
// single IP hammering the API, not a distributed residential-proxy botnet.
// If that shows up, upgrade the store to Upstash/Redis (same interface,
// shared state) rather than rewriting this logic.
// /api/nearby added: it fans out to third-party Overpass mirrors per request
// (see that route's own comment on its ~2-concurrent-slot budget) and its
// cache key includes the raw query string, so varying either the coordinates
// by a hair or the query text bypasses the cache on every hit — with no limit
// here, that let a script force a fresh outbound request per call, risking
// the server's own outbound IP getting rate-limited/banned by Overpass and
// breaking the feature for every real visitor.
export const config = { matcher: ['/api/rently/:path*', '/api/nearby'] }

const WINDOW_MS = 60_000
const GENERAL_LIMIT = 120
const PROPERTIES_ANON_LIMIT = 20
const NEARBY_LIMIT = 30

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

// A stable per-caller identity for the general bucket: the bearer token when
// present (each signed-in visitor gets their own budget, immune to noisy
// neighbors on a shared IP), else the IP. Not signature-verified — that's
// fine here, this is only a front-door throttle, not authorization; the
// actual backend still verifies the token on every real request.
function generalBucketKey(req: NextRequest, ip: string): string {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return `tok:${auth.slice(7, 7 + 64)}`
  return `ip:${ip}`
}

function tooManyRequests(): NextResponse {
  return new NextResponse(JSON.stringify({ message: 'Too many requests' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
  })
}

export function proxy(req: NextRequest): NextResponse {
  const ip = clientIp(req)

  if (req.nextUrl.pathname.startsWith('/api/nearby')) {
    if (!hit(`${ip}:nearby`, NEARBY_LIMIT)) return tooManyRequests()
    return NextResponse.next()
  }

  if (!hit(`${generalBucketKey(req, ip)}:general`, GENERAL_LIMIT)) {
    return tooManyRequests()
  }

  const isPropertiesFeed = req.nextUrl.pathname.startsWith('/api/rently/properties')
  const isAnonymous = !req.headers.get('authorization')
  if (isPropertiesFeed && isAnonymous && !hit(`${ip}:properties-anon`, PROPERTIES_ANON_LIMIT)) {
    return tooManyRequests()
  }

  return NextResponse.next()
}
