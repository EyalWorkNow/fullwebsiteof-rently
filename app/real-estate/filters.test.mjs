// Run:  cd rently-website && node --test app/real-estate/filters.test.mjs
//
// Tests the REAL filters.ts. Node 20 has no --experimental-strip-types, so the
// module is transpiled to a temp dir with the project's own tsc first (see
// compile() below) and then imported. filters.ts's only import is
// `import type { Property }`, which tsc erases, so the emitted JS is standalone
// and needs no path aliases or bundler.
//
// The fixtures below are shaped like the LIVE /api/listings payload, warts and
// all: `features` / `featureLabels` arrive as JSON-encoded STRINGS, most rows
// carry no transactionType / condition / agencyListing, entryDate is a mix of
// "YYYY-MM-DD HH:MM:SS", Israeli "DD/MM", 'מיידי', 'גמיש' and ''.

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
  const out = mkdtempSync(join(tmpdir(), 'rently-filters-'))
  // A generated tsconfig (rather than bare CLI flags) so the project's `@/*`
  // path alias resolves — otherwise tsc can't find the type-only import.
  const config = join(out, 'tsconfig.json')
  writeFileSync(config, JSON.stringify({
    compilerOptions: {
      outDir: out,
      // The type-only import lives outside app/real-estate, so the project root
      // is the only valid rootDir — output lands at <out>/app/real-estate/.
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
    files: [resolve(here, 'filters.ts')],
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
  return join(out, 'app/real-estate/filters.js')
}

const F = await import(pathToFileURL(compile()).href)

// ── fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-08-05T12:00:00Z')

/** A plain scraped row: features is a JSON-encoded ARRAY of Hebrew labels. */
const scraped = (over = {}) => ({
  id: 'scraped', lat: 32, lon: 34, price: 7500, rooms: 4, sizeM2: 100,
  floor: '3', city: 'תל אביב', neighborhood: 'פלורנטין', street: 'הרצל',
  propertyType: 'דירה', status: 'active',
  createdAt: '2026-07-01T00:00:00Z',
  entryDate: '2026-05-26 00:00:00',
  features: '["מזגן", "משופצת", "סורגים", "מחסן"]',
  smartTags: [], rankScore: 0.5,
  ...over,
})

/** An app-authored row: features is a JSON-encoded OBJECT of booleans. */
const authored = (over = {}) => ({
  id: 'authored', lat: 32, lon: 34, price: 6000, rooms: 3, sizeM2: 80,
  floor: '2', city: 'רמת גן', propertyType: 'דירה', condition: 'תקין',
  transactionType: 'rent', agencyListing: false, status: 'active',
  createdAt: '2026-08-02T00:00:00Z',
  entryDate: 'מיידי',
  features: '{"balcony":true,"parking":true,"storage":false,"airConditioning":true}',
  featureLabels: '["מרפסת","חניה","מזגן"]',
  feat_elevator: true, feat_pool: false,
  smartTags: [], rankScore: 0.9,
  ...over,
})

const f = (over = {}) => ({ ...F.defaultFilters(), ...over })

// ── feature decoding (the field shapes that silently returned zero rows) ─────

test('features arriving as a JSON-encoded array string is decoded', () => {
  const keys = F.enabledFeatureKeys(scraped())
  assert.ok(keys.has('airConditioning'), 'מזגן → airConditioning')
  assert.ok(keys.has('renovated'), 'משופצת → renovated')
  assert.ok(keys.has('bars'), 'סורגים → bars')
  assert.ok(keys.has('storage'), 'מחסן → storage')
})

test('features arriving as a JSON-encoded boolean map is decoded, false excluded', () => {
  const keys = F.enabledFeatureKeys(authored())
  assert.ok(keys.has('balcony'))
  assert.ok(keys.has('parking'))
  assert.ok(!keys.has('storage'), 'storage:false must not be enabled')
})

test('featureLabels as a JSON string is decoded, not iterated character-by-character', () => {
  const keys = F.enabledFeatureKeys({ ...scraped(), features: '', featureLabels: '["מרפסת","מעלית"]' })
  assert.ok(keys.has('balcony'))
  assert.ok(keys.has('elevator'))
  // The old code spread the raw string, producing single-letter "features".
  assert.ok(!keys.has('מ'), 'must not contain single characters')
  assert.ok(!keys.has('['))
})

test('top-level feat_<catalogKey> booleans are picked up', () => {
  const keys = F.enabledFeatureKeys(authored())
  assert.ok(keys.has('elevator'), 'feat_elevator:true')
  assert.ok(!keys.has('pool'), 'feat_pool:false')
})

test('canonicalFeatureKey resolves legacy short names and catalog-suffixed ones', () => {
  assert.equal(F.canonicalFeatureKey('feat_air'), 'airConditioning') // legacy map
  assert.equal(F.canonicalFeatureKey('feat_airConditioning'), 'airConditioning') // live rows
  assert.equal(F.canonicalFeatureKey('feat_sunBalcony'), 'sunBalcony')
  assert.equal(F.canonicalFeatureKey('מרפסת'), 'balcony')
  assert.equal(F.canonicalFeatureKey('ממ״ד'), 'mamad') // geresh normalisation
  assert.equal(F.canonicalFeatureKey('totally_unknown'), 'totally_unknown')
})

test('decodeStringList tolerates arrays, JSON strings, junk and a bare label', () => {
  assert.deepEqual(F.decodeStringList(['a', ' b ', '', 1]), ['a', 'b'])
  assert.deepEqual(F.decodeStringList('["a","b"]'), ['a', 'b'])
  assert.deepEqual(F.decodeStringList('{"a":true}'), [])
  assert.deepEqual(F.decodeStringList(undefined), [])
  assert.deepEqual(F.decodeStringList('מרפסת'), ['מרפסת'])
})

test('required features actually match live-shaped rows', () => {
  const items = [scraped(), authored()]
  assert.equal(F.applyFilters(items, f({ requiredFeatures: ['airConditioning'] }), NOW).length, 2)
  assert.equal(F.applyFilters(items, f({ requiredFeatures: ['balcony'] }), NOW).length, 1)
  // AND semantics across several required keys
  assert.equal(F.applyFilters(items, f({ requiredFeatures: ['balcony', 'parking'] }), NOW).length, 1)
  assert.equal(F.applyFilters(items, f({ requiredFeatures: ['balcony', 'renovated'] }), NOW).length, 0)
})

// ── entry-date parsing ───────────────────────────────────────────────────────

test('space-separated timestamps parse without relying on new Date()', () => {
  const d = F.parseEntryDate('2026-05-26 00:00:00', NOW)
  assert.ok(d instanceof Date)
  assert.equal(d.getFullYear(), 2026)
  assert.equal(d.getMonth(), 4)
  assert.equal(d.getDate(), 26)
})

test('Israeli DD/MM resolves to the current year, not year 2001', () => {
  const d = F.parseEntryDate('01/08', NOW)
  assert.equal(d.getFullYear(), 2026)
  assert.equal(d.getMonth(), 7) // August
  assert.equal(d.getDate(), 1)
  const d2 = F.parseEntryDate('15/09', NOW)
  assert.equal(d2.getMonth(), 8)
  assert.equal(d2.getDate(), 15)
})

test('a year-less date long past rolls into next year', () => {
  const d = F.parseEntryDate('10/01', NOW) // 10 Jan, 7 months behind NOW
  assert.equal(d.getFullYear(), 2027)
})

test('מיידי and גמיש both mean "available now"; empty and junk mean unknown', () => {
  assert.equal(F.parseEntryDate('מיידי', NOW).getTime(), NOW.getTime())
  assert.equal(F.parseEntryDate('גמיש', NOW).getTime(), NOW.getTime())
  assert.equal(F.parseEntryDate('', NOW), null)
  assert.equal(F.parseEntryDate('בקרוב', NOW), null)
  assert.equal(F.parseEntryDate('45/13', NOW), null)
  assert.equal(F.parseEntryDate(undefined, NOW), null)
})

test('move-in windows: unknown entry date fails (app parity), flexible passes', () => {
  const soon = scraped({ id: 'soon', entryDate: '2026-08-20 00:00:00' })
  const late = scraped({ id: 'late', entryDate: '2027-06-01 00:00:00' })
  const none = scraped({ id: 'none', entryDate: '' })
  const flex = scraped({ id: 'flex', entryDate: 'גמיש' })
  const items = [soon, late, none, flex]

  const ids = (mv) => F.applyFilters(items, f({ moveIn: mv }), NOW).map((p) => p.id).sort()
  assert.deepEqual(ids(['within30']), ['flex', 'soon'])
  assert.deepEqual(ids(['immediate']), ['flex'])
  assert.deepEqual(ids(['within90']), ['flex', 'soon'])
  // OR across options
  assert.deepEqual(ids(['immediate', 'within90']), ['flex', 'soon'])
  // no selection → everything, including rows with no date
  assert.equal(F.applyFilters(items, f(), NOW).length, 4)
})

// ── sorting ──────────────────────────────────────────────────────────────────

const sortFixtures = () => [
  scraped({ id: 'a', price: 9000, sizeM2: 60, createdAt: '2026-01-01T00:00:00Z', rankScore: 0.2, entryDate: '2026-12-01 00:00:00' }),
  scraped({ id: 'b', price: 3000, sizeM2: 200, createdAt: '2026-08-01T00:00:00Z', rankScore: 0.8, entryDate: '2026-09-01 00:00:00' }),
  scraped({ id: 'c', price: 6000, sizeM2: 120, createdAt: '2026-04-01T00:00:00Z', rankScore: 0.5, entryDate: '' }),
]
const order = (sortBy, extra = {}) =>
  F.applyFilters(sortFixtures(), f({ sortBy, ...extra }), NOW).map((p) => p.id)

test('price sorts both ways', () => {
  assert.deepEqual(order('priceAsc'), ['b', 'c', 'a'])
  assert.deepEqual(order('priceDesc'), ['a', 'c', 'b'])
})

test('biggest sorts by size desc', () => {
  assert.deepEqual(order('biggest'), ['b', 'c', 'a'])
})

test('newest actually reorders by createdAt (it used to be a no-op)', () => {
  assert.deepEqual(order('newest'), ['b', 'c', 'a'])
  // and it does not depend on the incoming array order
  const reversed = sortFixtures().reverse()
  assert.deepEqual(F.applyFilters(reversed, f({ sortBy: 'newest' }), NOW).map((p) => p.id), ['b', 'c', 'a'])
})

test('newest tolerates missing/odd createdAt by sinking those rows', () => {
  const items = [
    scraped({ id: 'nodate', createdAt: undefined }),
    scraped({ id: 'epoch', createdAt: 1785000000 }), // seconds
    scraped({ id: 'iso', createdAt: '2026-08-04T00:00:00Z' }),
  ]
  assert.deepEqual(F.applyFilters(items, f({ sortBy: 'newest' }), NOW).map((p) => p.id), ['iso', 'epoch', 'nodate'])
})

test('entrySoonest puts the nearest date first and undated rows last', () => {
  assert.deepEqual(order('entrySoonest'), ['b', 'a', 'c'])
})

test('bestMatch orders by rankScore desc, then createdAt', () => {
  assert.deepEqual(order('bestMatch'), ['b', 'c', 'a'])
})

test('bestMatch lets an explicit nearby preference outrank a higher rankScore', () => {
  const items = [
    scraped({ id: 'high', rankScore: 0.9, features: '[]' }),
    scraped({ id: 'gym', rankScore: 0.1, features: '["חדר כושר"]' }),
  ]
  assert.deepEqual(F.applyFilters(items, f({ sortBy: 'bestMatch' }), NOW).map((p) => p.id), ['high', 'gym'])
  assert.deepEqual(
    F.applyFilters(items, f({ sortBy: 'bestMatch', preferredNearby: ['gyms'] }), NOW).map((p) => p.id),
    ['gym', 'high'],
    'the nearby boost was previously dead code that only ran under sortBy=newest',
  )
})

test('sorting never mutates the caller array', () => {
  const items = sortFixtures()
  const before = items.map((p) => p.id)
  F.applyFilters(items, f({ sortBy: 'priceDesc' }), NOW)
  assert.deepEqual(items.map((p) => p.id), before)
})

// ── documented app-parity semantics (must NOT drift) ─────────────────────────

test('price below ₪600 counts as unknown and is gated by the toggle', () => {
  const items = [scraped({ id: 'ok' }), scraped({ id: 'unknown', price: 400 })]
  assert.deepEqual(F.applyFilters(items, f(), NOW).map((p) => p.id), ['ok'])
  assert.equal(F.applyFilters(items, f({ includeUnknownPriceListings: true }), NOW).length, 2)
})

test('budget bounds bite only once moved off the slider defaults', () => {
  const items = [scraped({ id: 'cheap', price: 3000 }), scraped({ id: 'lux', price: 39000 })]
  assert.equal(F.applyFilters(items, f(), NOW).length, 2, 'untouched slider filters nothing')
  assert.deepEqual(F.applyFilters(items, f({ maxBudget: 5000 }), NOW).map((p) => p.id), ['cheap'])
  assert.deepEqual(F.applyFilters(items, f({ minBudget: 10000 }), NOW).map((p) => p.id), ['lux'])
})

test('a sale listing survives the default "הכל" rent-scale budget', () => {
  const items = [scraped({ id: 'sale', price: 1_450_000, transactionType: 'sale' })]
  assert.equal(F.applyFilters(items, f(), NOW).length, 1)
})

test('missing size is kept by max-size but dropped by min-size', () => {
  const items = [scraped({ id: 'nosize', sizeM2: undefined })]
  assert.equal(F.applyFilters(items, f({ maxSizeM2: 500 }), NOW).length, 1)
  assert.equal(F.applyFilters(items, f({ minSizeM2: 10 }), NOW).length, 0)
})

test('unparsable floor is KEPT by a minimum-floor filter', () => {
  const items = [
    scraped({ id: 'ground', floor: 'קרקע' }),
    scraped({ id: 'blank', floor: '' }),
    scraped({ id: 'fifth', floor: '5' }),
  ]
  assert.deepEqual(F.applyFilters(items, f({ minFloor: 3 }), NOW).map((p) => p.id).sort(), ['blank', 'fifth'])
})

test('city matching handles the יפו suffix but not unrelated prefixes', () => {
  assert.ok(F.cityMatches('תל אביב יפו', 'תל אביב'))
  assert.ok(F.cityMatches('תל אביב', 'תל אביב יפו'))
  assert.ok(!F.cityMatches('גן יבנה', 'יבנה'))
  assert.ok(F.cityMatches('', 'תל אביב'), 'unknown city → keep')
})

test('rows with no transactionType are treated as rent', () => {
  const items = [scraped({ id: 'implicit' }), scraped({ id: 'sale', transactionType: 'sale', price: 1_000_000 })]
  const rent = F.withTransaction(f(), 'rent')
  const sale = F.withTransaction(f(), 'sale')
  assert.deepEqual(F.applyFilters(items, rent, NOW).map((p) => p.id), ['implicit'])
  assert.deepEqual(F.applyFilters(items, sale, NOW).map((p) => p.id), ['sale'])
})

test('a budget left over from the other price scale cannot empty the page', () => {
  // transactionType flipped WITHOUT withTransaction() — e.g. a stale stored
  // payload. The rent-scale ₪40,000 ceiling must not gate sale listings.
  const items = [scraped({ id: 'sale', transactionType: 'sale', price: 1_000_000 })]
  assert.deepEqual(F.applyFilters(items, f({ transactionType: 'sale' }), NOW).map((p) => p.id), ['sale'])
})

test('free-text query reaches feature labels and street numbers, like searchableText', () => {
  const items = [
    scraped({ id: 'ac' }),
    scraped({ id: 'plain', features: '[]', neighborhood: 'הצפון הישן', street: 'דיזנגוף', streetNumber: 12 }),
  ]
  assert.deepEqual(F.applyFilters(items, f({ query: 'משופצת' }), NOW).map((p) => p.id), ['ac'])
  assert.deepEqual(F.applyFilters(items, f({ query: 'דיזנגוף 12' }), NOW).map((p) => p.id), ['plain'])
  assert.deepEqual(F.applyFilters(items, f({ query: 'פלורנטין' }), NOW).map((p) => p.id), ['ac'])
})

// ── facet counts ─────────────────────────────────────────────────────────────

test('facet counts ignore their own facet so a chip never lies about itself', () => {
  const items = [
    scraped({ id: 'a', propertyType: 'דירה' }),
    scraped({ id: 'b', propertyType: 'סטודיו' }),
    scraped({ id: 'c', propertyType: 'סטודיו' }),
  ]
  const c = F.facetCounts(items, f({ propertyTypes: ['דירה'] }), NOW)
  assert.equal(c.total, 1, 'the active filter still applies to the total')
  assert.equal(c.propertyType['דירה'], 1)
  assert.equal(c.propertyType['סטודיו'], 2, 'sibling option counts as if it were the selection')
})

test('facet counts do respect the OTHER active filters', () => {
  const items = [
    scraped({ id: 'a', propertyType: 'דירה', city: 'תל אביב' }),
    scraped({ id: 'b', propertyType: 'סטודיו', city: 'חיפה' }),
  ]
  const c = F.facetCounts(items, f({ city: 'תל אביב' }), NOW)
  assert.equal(c.propertyType['דירה'], 1)
  assert.equal(c.propertyType['סטודיו'], undefined)
})

test('facet counts surface a dead option instead of silently emptying the page', () => {
  // No live row is flagged agencyListing, so "תיווך בלבד" can only ever give 0.
  const items = [scraped(), authored()]
  const c = F.facetCounts(items, f(), NOW)
  assert.equal(c.listingSource.private, 2)
  assert.equal(c.listingSource.agency ?? 0, 0)
})

test('facet counts include feature and move-in buckets', () => {
  const c = F.facetCounts([scraped(), authored()], f(), NOW)
  assert.equal(c.feature.airConditioning, 2)
  assert.equal(c.feature.balcony, 1)
  // Both rows are available now: 'מיידי', and a 2026-05-26 date already past.
  assert.equal(c.moveIn.immediate, 2)
})

// ── active-filter accounting ─────────────────────────────────────────────────

test('a range counts as one active filter, not one per thumb', () => {
  assert.equal(F.activeFilterCount(f()), 0)
  assert.equal(F.activeFilterCount(f({ minBudget: 3000, maxBudget: 8000 })), 1)
  assert.equal(F.activeFilterCount(f({ minRooms: 2, maxRooms: 4 })), 1)
  assert.equal(F.activeFilterCount(f({ minSizeM2: 50, maxSizeM2: 120 })), 1)
  assert.equal(F.activeFilterCount(f({ minBudget: 3000, includeUnknownPriceListings: true })), 2)
})

test('the chip row lists every active filter and each chip clears only itself', () => {
  const filters = f({
    query: 'תל אביב', city: 'חיפה', minFloor: 2,
    propertyTypes: ['דירה'], requiredFeatures: ['balcony'], moveIn: ['within30'],
  })
  const chips = F.describeActiveFilters(filters)
  assert.equal(chips.length, F.activeFilterCount(filters))
  assert.ok(chips.some((c) => c.label === 'מרפסת'), 'feature chips show the Hebrew label')

  const cleared = chips.find((c) => c.id === 'feature:balcony').clear(filters)
  assert.deepEqual(cleared.requiredFeatures, [])
  assert.deepEqual(cleared.propertyTypes, ['דירה'], 'other filters untouched')
  assert.equal(F.describeActiveFilters(F.defaultFilters()).length, 0)
})

test('clearing the transaction chip also restores that scale price bounds', () => {
  const filters = F.withTransaction(f(), 'sale')
  const back = F.describeActiveFilters(filters).find((c) => c.id === 'transaction').clear(filters)
  assert.deepEqual(back, F.defaultFilters())
})

// ── stored-filter hardening ──────────────────────────────────────────────────

test('sanitizeFilters repairs a stale or hostile stored payload', () => {
  const d = F.defaultFilters()
  assert.deepEqual(F.sanitizeFilters(null), d)
  assert.deepEqual(F.sanitizeFilters('nope'), d)

  // An older build stored sortBy: 'match' — it used to survive and silently
  // disable sorting; a non-array list used to throw on `.length`.
  const fixed = F.sanitizeFilters({ sortBy: 'match', propertyTypes: 'דירה', moveIn: ['bogus', 'within30'] })
  assert.equal(fixed.sortBy, d.sortBy)
  assert.deepEqual(fixed.propertyTypes, [])
  assert.deepEqual(fixed.moveIn, ['within30'])

  // Nonsense numbers get clamped into the transaction's own scale.
  const clamped = F.sanitizeFilters({ transactionType: 'rent', minBudget: -5, maxBudget: 9e9, minRooms: 99, maxSizeM2: NaN })
  assert.equal(clamped.minBudget, 600)
  assert.equal(clamped.maxBudget, 40000)
  assert.equal(clamped.maxRooms, F.UNSET_MAX_ROOMS)
  assert.equal(clamped.maxSizeM2, F.SIZE_SLIDER_MAX)

  // An inverted range is normalised rather than filtering everything out.
  const inverted = F.sanitizeFilters({ minBudget: 20000, maxBudget: 5000 })
  assert.ok(inverted.maxBudget >= inverted.minBudget)

  // Unknown nearby kinds are dropped; real ones survive.
  assert.deepEqual(F.sanitizeFilters({ preferredNearby: ['gyms', 'wormholes'] }).preferredNearby, ['gyms'])
})

test('a sanitized payload round-trips unchanged', () => {
  const filters = f({ city: 'חיפה', minRooms: 3, requiredFeatures: ['balcony'], sortBy: 'priceAsc' })
  assert.deepEqual(F.sanitizeFilters(JSON.parse(JSON.stringify(filters))), filters)
})
