// Run:  cd rently-website && node --test lib/live/analytics.test.mjs
//
// Tests the REAL lib/live/analytics.ts. Node 20 has no --experimental-strip-types,
// so the module is transpiled to a temp dir with the project's own tsc and then
// imported (same approach as app/real-estate/filters.test.mjs).
//
// analytics.ts's only STATIC imports are `import type` (erased by tsc), so the
// emitted JS is standalone. `./firebase` and `./enrichment` are reached through
// dynamic import() inside try/catch, which is exactly what lets these tests run
// outside a browser: those imports fail in node, the code falls back to an
// unauthenticated request, and the stubbed global fetch answers it.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '../..')

function compile() {
  const out = mkdtempSync(join(tmpdir(), 'rently-analytics-'))
  const config = join(out, 'tsconfig.json')
  writeFileSync(config, JSON.stringify({
    compilerOptions: {
      outDir: out,
      rootDir: projectRoot,
      module: 'es2022',
      target: 'es2022',
      moduleResolution: 'bundler',
      lib: ['es2022', 'dom'],
      strict: true,
      skipLibCheck: true,
      types: [],
      baseUrl: projectRoot,
      paths: { '@/*': ['./*'] },
    },
    files: [resolve(here, 'analytics.ts')],
  }))
  try {
    execFileSync(
      process.execPath,
      [resolve(projectRoot, 'node_modules/typescript/bin/tsc'), '-p', config],
      { stdio: 'pipe', encoding: 'utf8' },
    )
  } catch (e) {
    throw new Error(`tsc failed:\n${e.stdout ?? ''}${e.stderr ?? ''}`)
  }
  return join(out, 'lib/live/analytics.js')
}

const A = await import(pathToFileURL(compile()).href)

// ── fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-08-05T12:00:00Z')
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

const prop = (over = {}) => ({
  id: 'p1', lat: 32, lon: 34, price: 7000, rooms: 3,
  city: 'תל אביב', status: 'active', ownerUserId: 'u1',
  createdAt: daysAgo(10),
  ...over,
})

/** n peer listings in the same city and room band, each `days` old. */
const peers = (n, days, over = {}) =>
  Array.from({ length: n }, (_, i) => prop({ id: `peer${i}`, createdAt: daysAgo(days), ...over }))

const emptyBenchmark = { medianViews: null, medianDaysOnMarket: null, sampleSize: 0 }

const state = (over = {}) => A.deriveHealthState({
  views: 10, saves: 0, inquiries: 0, daysOnMarket: 3,
  priceBadge: null, benchmark: emptyBenchmark,
  ...over,
})

// ── constants (spec §4) ──────────────────────────────────────────────────────

test('the spec constants are what the spec says', () => {
  assert.equal(A.K_ANON, 5)
  assert.equal(A.MIN_RATE_DENOM, 30)
})

// ── state machine: one test per rule ─────────────────────────────────────────

test('rule 1: zero views after 7+ days is needs_action, and names the day count', () => {
  const r = state({ views: 0, daysOnMarket: 9 })
  assert.equal(r.state, 'needs_action')
  assert.ok(r.reasons.some((x) => x.includes('9')), `reason must name the number: ${r.reasons}`)
})

test('rule 1 does not fire before day 7, nor on unloaded views', () => {
  assert.equal(state({ views: 0, daysOnMarket: 6 }).state, 'healthy')
  // views === null is "not loaded", not "nobody looked" — it must never accuse.
  assert.equal(state({ views: null, daysOnMarket: 40 }).state, 'healthy')
})

test('rule 2: more than 1.5x the peer median days is needs_action, naming both numbers', () => {
  const benchmark = { medianViews: null, medianDaysOnMarket: 20, sampleSize: 12 }
  const r = state({ views: 5, daysOnMarket: 31, benchmark })
  assert.equal(r.state, 'needs_action')
  const reason = r.reasons.find((x) => x.includes('31'))
  assert.ok(reason, 'reason must name the listing days')
  assert.ok(reason.includes('20'), 'reason must name the peer median')
  assert.ok(reason.includes('12'), 'reason must name the sample size')
  // exactly 1.5x is not "more than"
  assert.equal(state({ views: 5, daysOnMarket: 30, benchmark }).state, 'healthy')
})

test('rule 3: saves with zero inquiries and 20+ views is watch, not needs_action', () => {
  const r = state({ views: 24, saves: 6, inquiries: 0 })
  assert.equal(r.state, 'watch')
  const reason = r.reasons[0]
  assert.ok(reason.includes('6') && reason.includes('24'), `reason must name saves and views: ${reason}`)
  // under 20 views there is not enough traffic to call it a contact problem
  assert.equal(state({ views: 19, saves: 6, inquiries: 0 }).state, 'healthy')
  // and an unloaded inquiry count must not be read as zero inquiries
  assert.equal(state({ views: 24, saves: 6, inquiries: null }).state, 'healthy')
})

test('rule 4: above_market plus slower than the peer median is needs_action', () => {
  const benchmark = { medianViews: null, medianDaysOnMarket: 20, sampleSize: 9 }
  const r = state({
    views: 30, daysOnMarket: 25, benchmark,
    priceBadge: { badge: 'above_market', deltaPct: 14 },
  })
  assert.equal(r.state, 'needs_action')
  const reason = r.reasons.find((x) => x.includes('25'))
  assert.ok(reason.includes('20'), 'reason must name the peer median')
  assert.ok(reason.includes('14'), 'reason should name the price delta it had')
  // a fair price at the same age does not fire
  assert.equal(state({ views: 30, daysOnMarket: 25, benchmark, priceBadge: { badge: 'fair' } }).state, 'healthy')
  // above market but FASTER than peers does not fire either
  assert.equal(
    state({ views: 30, daysOnMarket: 12, benchmark, priceBadge: { badge: 'above_market' } }).state,
    'healthy',
  )
})

test('rule 5: otherwise healthy, and the reason still quotes real numbers', () => {
  const r = state({ views: 40, saves: 3, inquiries: 2, daysOnMarket: 5 })
  assert.equal(r.state, 'healthy')
  assert.ok(r.reasons.length === 1)
  assert.ok(/40/.test(r.reasons[0]) && /3/.test(r.reasons[0]))
})

test('nothing loaded reports "no data", it does not certify the listing as healthy', () => {
  const r = state({ views: null, saves: null, inquiries: null, daysOnMarket: null })
  assert.equal(r.state, 'healthy') // the contract has no fourth state
  assert.ok(r.reasons[0].includes('לא נטענו'), r.reasons[0])
})

test('several rules can fire at once; the worst state wins and every reason is kept', () => {
  const benchmark = { medianViews: null, medianDaysOnMarket: 10, sampleSize: 8 }
  const r = state({ views: 0, saves: 0, inquiries: 0, daysOnMarket: 40, benchmark })
  assert.equal(r.state, 'needs_action')
  assert.equal(r.reasons.length, 2, 'zero-views AND stale-vs-peers both fired')
})

// ── benchmark ────────────────────────────────────────────────────────────────

test('peers are same city and rooms within +/-0.5; medians come from createdAt', () => {
  const catalogue = [
    ...peers(3, 20),
    prop({ id: 'rooms35', rooms: 3.5, createdAt: daysAgo(20) }), // within +/-0.5 → in
    prop({ id: 'rooms4', rooms: 4, createdAt: daysAgo(20) }), // out
    prop({ id: 'haifa', city: 'חיפה', createdAt: daysAgo(20) }), // out
    prop({ id: 'p1' }), // the subject itself is never its own peer
  ]
  const b = A.computeBenchmark(prop(), catalogue, { now: NOW })
  assert.equal(b.sampleSize, 4)
  assert.equal(b.medianDaysOnMarket, 20)
})

test('a peer group under 5 yields no comparison, and cannot fire a median rule', () => {
  const b = A.computeBenchmark(prop(), peers(4, 5), { now: NOW })
  assert.equal(b.sampleSize, 4)
  assert.equal(b.medianDaysOnMarket, 5, 'the median is computed…')
  // …but it must not be used: 60 days vs a median of 5 would scream needs_action
  // on a 4-listing sample. It must stay silent.
  const r = state({ views: 12, daysOnMarket: 60, benchmark: b })
  assert.equal(r.state, 'healthy')
  const r2 = state({ views: 12, daysOnMarket: 60, benchmark: b, priceBadge: { badge: 'above_market' } })
  assert.equal(r2.state, 'healthy', 'the price rule also needs a usable peer median')
  // one more peer crosses the threshold and the same numbers now do fire
  const b5 = A.computeBenchmark(prop(), peers(5, 5), { now: NOW })
  assert.equal(b5.sampleSize, 5)
  assert.equal(state({ views: 12, daysOnMarket: 60, benchmark: b5 }).state, 'needs_action')
})

test('medianViews stays null unless the caller supplies peer view counts', () => {
  const catalogue = peers(6, 10)
  assert.equal(A.computeBenchmark(prop(), catalogue, { now: NOW }).medianViews, null)
  const supplied = new Map(catalogue.map((p, i) => [p.id, (i + 1) * 10]))
  assert.equal(A.computeBenchmark(prop(), catalogue, { now: NOW, peerViews: supplied }).medianViews, 35)
})

test('unparsable createdAt yields a null daysOnMarket rather than a bogus number', () => {
  assert.equal(A.daysOnMarket(prop({ createdAt: undefined }), NOW), null)
  assert.equal(A.daysOnMarket(prop({ createdAt: 'לא ידוע' }), NOW), null)
  assert.equal(A.daysOnMarket(prop({ createdAt: daysAgo(10) }), NOW), 10)
  assert.equal(A.daysOnMarket(prop({ createdAt: '2026-07-26 12:00:00' }), NOW), 10)
  assert.equal(A.daysOnMarket(prop({ createdAt: 1785067200 }), NOW), 10) // epoch seconds
  assert.equal(A.daysOnMarket(prop({ createdAt: daysAgo(-3) }), NOW), 0, 'a future date is 0, not negative')
})

// ── k-anonymity ──────────────────────────────────────────────────────────────

const liker = (over = {}) => ({
  tenantId: 't', household: 'family', lifeStage: 'family', hasCar: true,
  wfh: false, numChildren: 2, budgetMax: 7000, ...over,
})
const many = (n, over = {}) => Array.from({ length: n }, (_, i) => liker({ tenantId: `t${i}`, ...over }))

test('below K_ANON the whole breakdown is suppressed — no segments at all', () => {
  const a = A.buildAudience(many(4), ['family'])
  assert.equal(a.total, 4)
  assert.equal(a.suppressed, true)
  assert.deepEqual(a.segments, [])
  assert.equal(a.matchQuality, 'unknown', 'nothing to compare against')
})

test('at exactly K_ANON the breakdown opens up', () => {
  const a = A.buildAudience(many(5), [])
  assert.equal(a.suppressed, false)
  assert.ok(a.segments.length > 0)
  assert.ok(a.segments.every((s) => s.count >= A.K_ANON))
})

test('a segment under K_ANON folds into אחר instead of being shown', () => {
  // 8 families + 6 couples + 3 roommates + 2 singles.
  const rows = [
    ...many(8, { household: 'family' }),
    ...many(6, { household: 'couple' }),
    ...many(3, { household: 'roommates' }),
    ...many(2, { household: 'single' }),
  ]
  const a = A.buildAudience(rows, [])
  const households = a.segments.filter((s) => s.key.startsWith('household:'))
  const keys = households.map((s) => s.key).sort()
  assert.deepEqual(keys, ['household:couple', 'household:family', 'household:other'])
  assert.equal(households.find((s) => s.key === 'household:other').count, 5, '3 + 2 folded together')
  assert.equal(households.find((s) => s.key === 'household:other').label, 'אחר')
  assert.ok(!a.segments.some((s) => s.key.includes('roommates')), 'the small segment must not leak')
  assert.ok(!a.segments.some((s) => s.key.includes('single')))
})

test('an אחר bucket that still misses K_ANON is dropped, not shown', () => {
  const rows = [...many(9, { household: 'family' }), ...many(2, { household: 'single' })]
  const a = A.buildAudience(rows, [])
  const households = a.segments.filter((s) => s.key.startsWith('household:'))
  assert.deepEqual(households.map((s) => s.key), ['household:family'])
  assert.ok(!a.segments.some((s) => s.label === 'אחר'), 'a residual of 2 is as identifying as the segment')
})

test('rows that declare nothing are counted in the total but segment nothing', () => {
  const a = A.buildAudience(Array.from({ length: 7 }, (_, i) => ({ tenantId: `x${i}` })), [])
  assert.equal(a.total, 7)
  assert.equal(a.suppressed, false)
  assert.deepEqual(a.segments, [])
  assert.equal(a.matchQuality, 'unknown')
})

test('a nested tenant snapshot is read as well as flat fields', () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({
    tenantId: `n${i}`,
    tenant: { household: 'couple', hasCar: false, budgetMax: 9000 },
  }))
  const a = A.buildAudience(rows, [])
  assert.ok(a.segments.some((s) => s.key === 'household:couple' && s.count === 6))
  assert.ok(a.segments.some((s) => s.key === 'car:no' && s.count === 6))
  assert.ok(a.segments.some((s) => s.key === 'budget:8000_10000' && s.count === 6))
})

// ── protected dimensions ─────────────────────────────────────────────────────

test('no protected attribute ever reaches the output, however loudly the rows carry it', () => {
  const rows = many(30, {
    religiousLifestyle: 'dati',
    shabbatObservant: true,
    keepsKosher: true,
    isOleh: true,
    age: 34,
    monthlyIncome: 22000,
    sector: 'חרדי',
    countryOfOrigin: 'צרפת',
    ethnicity: 'x',
    gender: 'f',
    maritalStatus: 'married',
  })
  const a = A.buildAudience(rows, [])
  assert.ok(a.segments.length > 0, 'the allowed dimensions still work')
  const blob = JSON.stringify(a).toLowerCase()
  // Word-boundary match — a plain .includes() false-positives on e.g. 'age'
  // being a substring of the perfectly legitimate 'lifeStage' key.
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const dim of A.PROTECTED_DIMENSIONS) {
    const re = new RegExp(`\\b${escapeRe(dim.toLowerCase())}\\b`)
    assert.ok(!re.test(blob), `protected dimension leaked: ${dim}`)
  }
  for (const value of ['dati', 'חרדי', 'צרפת', '22000', 'married']) {
    assert.ok(!blob.includes(value.toLowerCase()), `protected value leaked: ${value}`)
  }
  // every emitted key belongs to the allow-list of dimensions
  const allowed = new Set(['household', 'lifeStage', 'car', 'wfh', 'children', 'budget'])
  for (const s of a.segments) assert.ok(allowed.has(s.key.split(':')[0]), `unexpected dimension ${s.key}`)
})

// ── declared target vs realised audience ─────────────────────────────────────

test('matchQuality: aligned / partial / mismatch / unknown', () => {
  const rows = [...many(10, { household: 'family', lifeStage: 'family' }),
                ...many(6, { household: 'couple', lifeStage: 'young_couple' })]
  assert.equal(A.buildAudience(rows, ['family']).matchQuality, 'aligned')
  assert.equal(A.buildAudience(rows, ['משפחה']).matchQuality, 'aligned', 'Hebrew labels match too')
  assert.equal(A.buildAudience(rows, ['family', 'retiree']).matchQuality, 'partial')
  assert.equal(A.buildAudience(rows, ['retiree', 'student']).matchQuality, 'mismatch')
  assert.equal(A.buildAudience(rows, []).matchQuality, 'unknown', 'no declared cohort')
  assert.equal(A.buildAudience(many(3), ['family']).matchQuality, 'unknown', 'suppressed')
})

// ── formatRate ───────────────────────────────────────────────────────────────

test('under MIN_RATE_DENOM formatRate gives raw counts, never a percentage', () => {
  const r = A.formatRate(3, 12)
  assert.equal(r.isRate, false)
  assert.equal(r.text, '3 פניות מ־12 צפיות')
  assert.ok(!r.text.includes('%'))
  assert.ok(!/\d\.\d/.test(r.text), 'no decimals, ever')
  assert.equal(A.formatRate(3, 29).isRate, false, '29 is still under the floor')
})

test('at or above MIN_RATE_DENOM formatRate gives a hard-rounded 1-in-N rate', () => {
  const r = A.formatRate(10, 40)
  assert.equal(r.isRate, true)
  assert.equal(r.text, 'בערך 1 מכל 4')
  assert.equal(A.formatRate(3, 30).text, 'בערך 1 מכל 10')
  // rounding is hard: 7/100 is "1 in 14", not "1 in 14.3"
  const odd = A.formatRate(7, 100)
  assert.equal(odd.text, 'בערך 1 מכל 14')
  assert.ok(!/\./.test(odd.text))
})

test('formatRate refuses degenerate inputs instead of printing nonsense', () => {
  assert.deepEqual(A.formatRate(0, 0), { text: 'אין מספיק נתונים', isRate: false })
  assert.deepEqual(A.formatRate(null, 50), { text: 'אין מספיק נתונים', isRate: false })
  assert.deepEqual(A.formatRate(5, null), { text: 'אין מספיק נתונים', isRate: false })
  assert.deepEqual(A.formatRate(NaN, 50), { text: 'אין מספיק נתונים', isRate: false })
  // zero numerator on a big denominator: a count, not "1 in infinity"
  const zero = A.formatRate(0, 80)
  assert.equal(zero.isRate, false)
  assert.equal(zero.text, '0 פניות מ־80 צפיות')
  // numerator >= denominator can't be a "1 in N" either
  assert.equal(A.formatRate(80, 80).isRate, false)
  assert.equal(A.formatRate(60, 80).isRate, false, '1 in 1 is not information')
})

test('formatRate takes Hebrew labels for other pairings', () => {
  assert.equal(
    A.formatRate(4, 12, { numerator: 'שמירות', denominator: 'צפיות' }).text,
    '4 שמירות מ־12 צפיות',
  )
})

// ── network fail-soft: null, never 0 ─────────────────────────────────────────

function withFetch(handler, fn) {
  const original = globalThis.fetch
  globalThis.fetch = handler
  return Promise.resolve().then(fn).finally(() => { globalThis.fetch = original })
}

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const fail = (status = 500) => ({ ok: false, status, json: async () => ({}) })

test('a failed counter fetch reads as null, not as zero', async () => {
  await withFetch(async () => fail(500), async () => {
    const h = await A.fetchListingHealth(prop({ createdAt: daysAgo(30) }), [], { now: NOW, matches: null })
    assert.equal(h.views, null, 'a 500 must not read as "nobody viewed it"')
    assert.equal(h.saves, null)
    assert.equal(h.inquiries, null, 'matches unavailable is not "no inquiries"')
    assert.equal(h.priceBadge, null)
    assert.equal(h.daysOnMarket, 30, 'the local computation survives the network failure')
    // and with nothing measured, no rule may accuse the listing
    assert.equal(h.state, 'healthy')
    assert.ok(h.reasons[0].includes('לא נטענו'))
  })
})

test('one dead endpoint blanks one field, not the card', async () => {
  await withFetch(async (url) => {
    if (String(url).includes('property_views/count')) return fail(503)
    if (String(url).includes('property_likes/count')) return ok({ count: 12 })
    return fail(404)
  }, async () => {
    const h = await A.fetchListingHealth(prop(), [], { now: NOW, matches: [] })
    assert.equal(h.views, null, 'the dead endpoint')
    assert.equal(h.saves, 12, 'the live one still landed')
    assert.equal(h.inquiries, 0, 'a real empty match list IS zero')
  })
})

test('counts are read from the /count endpoints, not the row counter fields', async () => {
  const seen = []
  await withFetch(async (url) => {
    seen.push(String(url))
    if (String(url).includes('property_views/count')) return ok({ count: 44 })
    if (String(url).includes('property_likes/count')) return ok({ data: { count: 7 } })
    return fail(404)
  }, async () => {
    // the row claims wildly inflated denormalised counters — they must be ignored
    const p = prop({ viewCount: 9999, likeCount: 9999 })
    const h = await A.fetchListingHealth(p, [], { now: NOW, matches: [] })
    assert.equal(h.views, 44)
    assert.equal(h.saves, 7)
    assert.ok(seen.some((u) => u.includes('/property_views/count?propertyId=p1')))
    assert.ok(seen.some((u) => u.includes('/property_likes/count?propertyId=p1')))
  })
})

test('fetchOwnerProperties drops removed rows and reports failure as ok:false', async () => {
  await withFetch(async (url) => {
    assert.ok(String(url).includes('/properties?ownerUserId=u1&order=desc&limit=200'), String(url))
    return ok({ items: [prop({ id: 'a' }), prop({ id: 'b', status: 'removed' }), prop({ id: 'c', status: 'rented' })] })
  }, async () => {
    const r = await A.fetchOwnerProperties('u1')
    assert.equal(r.ok, true)
    assert.deepEqual(r.items.map((p) => p.id), ['a', 'c'], 'removed is dropped, rented is kept')
  })
  await withFetch(async () => fail(403), async () => {
    const r = await A.fetchOwnerProperties('u1')
    assert.deepEqual(r.items, [])
    assert.equal(r.ok, false, 'empty + ok:false means "unknown", not "no listings"')
  })
})

test('inquiries count only the matches belonging to this property', async () => {
  await withFetch(async (url) => {
    if (String(url).includes('/count')) return ok({ count: 30 })
    return fail(404)
  }, async () => {
    const matches = [{ propertyId: 'p1' }, { propertyId: 'p1' }, { propertyId: 'other' }]
    const h = await A.fetchListingHealth(prop(), [], { now: NOW, matches })
    assert.equal(h.inquiries, 2)
  })
})
