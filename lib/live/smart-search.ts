// ═════════════════════════════════════════════════════════════════════════════
// SMART SEARCH — faithful TypeScript port of the app's on-device "אתי fast mode"
// engine. Instant, local, deterministic — no backend round-trip.
//
// Dart sources of truth (flutter-ranting-tinder-project):
//   • lib/core/search/smart_search.dart      — SmartSearch.parse / rank / _score
//   • lib/core/search/search_intent.dart     — SearchIntent.fromText
//   • lib/core/search/advanced_matcher.dart  — AdvancedMatcher (legacy ranking)
//   • lib/core/search/lifestyle_knowledge.dart — religiosity area fit
//   • lib/core/govdata/gov_data.dart         — CBS locality detection
//   • lib/presentation/features/search/search_chat_screen.dart — fast-mode reply
//
// Same keyword tables, same weights, same Hebrew strings. Section comments map
// 1:1 to the Dart sections. Do not "improve" the algorithm here — fix the Dart
// first, then re-port.
// ═════════════════════════════════════════════════════════════════════════════

import type { Property } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Types (ports of SearchQuery / ScoredProperty)
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionTypeFilter = 'any' | 'rent' | 'sale'

/** Port of SearchQuery (smart_search.dart). */
export interface ParsedQuery {
  city: string | null
  neighborhood: string | null
  minPrice: number | null
  maxPrice: number | null
  minRooms: number | null
  maxRooms: number | null
  propertyType: string | null
  amenities: Set<string> // feat_* keys
  requiredFeatures: Set<string> // canonical hard-gate keys (petsAllowed, parking…)
  excludeAreas: string[]
  areaDir: string | null
  areaDirExclude: boolean
  nearTrain: boolean
  cheapPreference: boolean
  transactionType: TransactionTypeFilter
  rawText: string
  intents: Set<string>
}

/** Port of ScoredProperty, over the web Property shape. */
export interface ScoredWebProperty {
  property: Property
  score: number
  /** Hebrew card tags exactly as the Dart _score emits them (📍 / 🚉 / amenity). */
  tags: string[]
  /** Verbatim AdvancedMatcher explanation reasons (advanced path only). */
  reasons: string[]
  /** AdvancedMatcher fitPct ("89% fit") — advanced path only. */
  matchPct?: number
  trainKm: number | null
  exact: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalityMatcher — hand list + Levenshtein (smart_search.dart top)
// ─────────────────────────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const len1 = a.length
  const len2 = b.length
  const dp: number[][] = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0))
  for (let i = 0; i <= len1; i++) dp[i][0] = i
  for (let j = 0; j <= len2; j++) dp[0][j] = j
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[len1][len2]
}

// Verbatim port of LocalityMatcher.allLocalities (incl. its quirks — same list).
const ALL_LOCALITIES: string[] = [
  // Major cities
  'תל אביב', 'ירושלים', 'חיפה', 'בחרה', 'אשדוד', 'אשקלון',
  // Central
  'רמת גן', 'גבעתיים', 'בני ברק', 'ראש העין', 'פתח תקווה',
  'רמלה', 'לוד', 'מודיעין', 'רעננה', 'הרצליה', 'כפר סבא',
  'קריית אונו', 'הוד השרון', 'אור יהודה', 'אופקים', 'קרית גת',
  // North
  'נתניה', 'חדרה', 'זכרון יעקב', 'קיסריה', 'עכו', 'טבריה',
  'ציפורי', 'מצפה נתוף', 'בית שאן', 'בית שמש', 'ירוחם',
  // South
  'באר שבע', 'עומץ', 'שדרות', 'אילת', 'מצפה רמון', 'ערד',
  'קרית חינם', 'דימונה', 'קרית שמונה', 'קרית מלאכי',
  // Neighborhoods in Tel Aviv
  'פלורנטין', 'נווה צדק', 'רוטשילד', 'כרם התימנים', 'לב העיר',
  'הצפון הישן', 'הצפון החדש', 'רמת אביב', 'בבלי', 'יד אליהו',
  'רמת החייל', 'שפירא', 'נחלת יצחק', 'תל ברוך', 'אפקה',
  'מונטיפיורי',
  // Villages and smaller towns (kibbutz/moshav rows of the Dart list omitted —
  // the CBS top-200 registry below covers real small localities properly)
  'ראש פינה', 'צפת', 'טירת כרמל', 'בת ים',
]

// ─────────────────────────────────────────────────────────────────────────────
// CBS locality registry — port of GovData.findLocalityInText (gov_data.dart).
// Top 200 real localities from assets/data/govdata/localities.json, ranked by
// transit-stop count (urban-size proxy). The app loads the full 1,199-record
// CBS file; the web inlines the top 200 (see port notes).
// ─────────────────────────────────────────────────────────────────────────────

const CBS_LOCALITIES: string[] = [
  'ירושלים', 'חיפה', 'תל אביב - יפו', 'באר שבע', 'בית שמש', 'פתח תקווה',
  'ראשון לציון', 'אשקלון', 'נתניה', 'אשדוד', 'חדרה', 'מודיעין-מכבים-רעות',
  'רהט', 'נצרת', 'רחובות', 'טבריה', 'חולון', 'הרצליה', 'עפולה', 'אילת',
  'רמת גן', 'נוף הגליל', 'ראש העין', 'דימונה', 'קרית גת', 'רעננה', 'נהריה',
  'ביתר עילית', 'קרית אתא', 'כרמיאל', 'כפר סבא', 'בני ברק', 'יבנה',
  'מודיעין עילית', 'שפרעם', 'רמלה', 'צפת', 'אופקים', 'שדרות', 'בת ים',
  'פרדס חנה-כרכור', 'מגדל העמק', 'נשר', 'מעלה אדומים', 'קרית שמונה', 'לוד',
  'עכו', 'מעלות-תרשיחא', 'ערד', 'אום אל-פחם', 'נס ציונה', 'קרית טבעון',
  'טמרה', 'נתיבות', 'הוד השרון', 'חריש', 'מגאר', 'יקנעם עילית', 'רמת השרון',
  'אריאל', 'מבשרת ציון', 'קרית ביאליק', 'טירת כרמל', 'אור עקיבא', "סח'נין",
  'קרית אונו', 'דאלית אל-כרמל', 'קרית מוצקין', 'אלעד', 'כפר כנא', 'קרית ים',
  'באר יעקב', 'טייבה', 'ירוחם', 'קיסריה', 'טירה', 'כפר קרע', 'בית שאן',
  'זכרון יעקב', 'ערערה-בנגב', 'שוהם', 'באקה אל-גרביה', 'אבן יהודה', 'גדרה',
  'בנימינה-גבעת עדה', 'גבעת זאב', 'גן יבנה', 'כפר קאסם', 'אור יהודה',
  'גבעתיים', 'זרזיר', 'כפר יונה', 'קדימה-צורן', 'קרית מלאכי', 'שלומי',
  'אפרת', "ג'ת", 'כפר ורדים', 'ערערה', 'רכסים', 'עספיא', 'אעבלין', 'כסיפה',
  'יהוד-מונוסון', 'יפיע', 'אבו סנאן', 'ירכא', 'פוריידיס', 'גני תקווה',
  'פקיעין (בוקייעה)', "בית ג'ן", 'עילוט', 'מגידו', 'עומר', 'גזר', 'כפר מנדא',
  'מיתר', 'חורפיש', 'חצור הגלילית', 'עראבה', 'חורה', 'כסרא-סמיע', 'עין מאהל',
  'גבעת שמואל', 'קצרין', "יאנוח-ג'ת", 'כאבול', 'קלנסווה', 'לכיש',
  'מזכרת בתיה', 'אלפי מנשה', 'גבע בנימין', 'מצפה רמון', 'שפיר', 'אזור',
  "ג'ולס", 'להבים', 'קרית עקרון', 'עתלית', 'ראש פינה', 'בוקעאתא',
  'באר טוביה', "מג'ד אל-כרום", 'ראמה', 'ביר אל-מכסור', 'כפר יאסיף',
  'צור הדסה', 'אכסאל', 'כוכב יעקב', 'עמנואל', 'בסמת טבעון',
  'כוכב יאיר-צור יגאל', 'דבוריה', 'דייר חנא', 'קרני שומרון', 'בית דגן',
  "ג'סר א-זרקא", "כעביה-טבאש-חג'אג'רה", 'קרית ארבע', 'אבו גוש', 'אורנית',
  "ג'דיידה-מכר", 'זמר', 'יבנאל', 'בית אל', "ג'לג'וליה", 'טורעאן', 'עראמשה',
  'דייר אל-אסד', 'מגדל', 'שבלי - אום אל-גנם', 'בענה', 'עיילבון', 'ריינה',
  'רמת ישי', 'אבן ספיר', 'נחף', 'אל סייד', 'סביון', 'כפר ברא', 'מטולה',
  'קדומים', 'שעב', 'תפרח', 'לקיה', 'מעלה עירון', 'אלון מורה',
  "בועיינה-נוג'ידאת", "מג'דל שמס", 'בסמה', 'מעיליא', 'נאעורה', 'נחלים',
  'תל מונד', 'אבטין', 'אליכין',
]

// Locality names that ARE extremely common Hebrew words (gov_data.dart).
const AMBIGUOUS_LOCALITY_NAMES = new Set(['אזור', 'חמד', 'גן', 'אור', 'נס'])
const HEBREW_PREFIXES = new Set(['ב', 'ל', 'מ', 'ה', 'ו', 'ש', 'כ'])

function normalizeLocalityName(s: string): string {
  return s
    .replace(/["'״׳]/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function isHebrewLetter(ch: string | undefined): boolean {
  if (!ch) return false
  const c = ch.charCodeAt(0)
  return c >= 0x05d0 && c <= 0x05ea
}

// True only if [word] appears as a WHOLE word in [text] — a single inseparable
// prefix (ב/ל/מ/ה/ו/ש/כ) is allowed ("בכרכור"), but "נחמד" does NOT match "חמד".
function containsWord(text: string, word: string): boolean {
  let i = text.indexOf(word)
  while (i >= 0) {
    const after = text[i + word.length]
    const afterOk = !isHebrewLetter(after)
    let beforeOk: boolean
    if (i === 0) beforeOk = true
    else if (!isHebrewLetter(text[i - 1])) beforeOk = true
    else if (HEBREW_PREFIXES.has(text[i - 1]) && (i === 1 || !isHebrewLetter(text[i - 2])))
      beforeOk = true
    else beforeOk = false
    if (beforeOk && afterOk) return true
    i = text.indexOf(word, i + 1)
  }
  return false
}

/** Port of GovData.findLocalityInText — longest CBS locality name in [text].
 *  Merged municipalities also match by their spoken parts ("כרכור", "בנימינה"). */
function findCbsLocalityInText(text: string): string | null {
  if (!text.trim()) return null
  const t = normalizeLocalityName(text)
  let best: string | null = null
  let bestLen = 0
  for (const n of CBS_LOCALITIES) {
    if (AMBIGUOUS_LOCALITY_NAMES.has(n)) continue
    const variants = [n]
    if (n.includes('-')) {
      for (const part of n.split('-').map((s) => s.trim())) {
        if (part.length >= 4) variants.push(part)
      }
    }
    for (const v of variants) {
      if (v.length >= 3 && v.length > bestLen && containsWord(t, v)) {
        best = n
        bestLen = v.length
      }
    }
  }
  return best
}

// ─────────────────────────────────────────────────────────────────────────────
// SearchIntent — port of search_intent.dart (canonical lifestyle intent keys)
// ─────────────────────────────────────────────────────────────────────────────

export const SearchIntent = {
  nearSea: 'near_sea', nightlife: 'nightlife', quiet: 'quiet', central: 'central',
  spacious: 'spacious', compact: 'compact', accessible: 'accessible',
  luxury: 'luxury', view: 'view', student: 'student',
  nearUniversity: 'near_university', investment: 'investment',
  roommates: 'roommates', single: 'single', couple: 'couple', wfh: 'wfh',
  goodSchools: 'good_schools', qualityArea: 'quality_area', safety: 'safety',
  transit: 'transit', green: 'green', health: 'health', youngPop: 'young_pop',
  convenience: 'convenience', growth: 'growth', employment: 'employment',
  lowFloor: 'low_floor', religiousArea: 'religious_area',
  youngChildren: 'young_children', teens: 'teens', cityArea: 'city_area',
} as const

const INTENT_PATTERNS: [string, RegExp][] = [
  [SearchIntent.nearSea, /הים|(?<=\s)לים|חוף|ליד המים|beach|seaside|seafront/i],
  [SearchIntent.nightlife,
    /נייטלייף|חיי ?ה?לילה|בילוי|לבלות|מקום לבלות|(?<![\wא-ת])בר(?![\wא-ת])|ברים|פאב|פאבים|מועדון|מסעד|בית ?ה?קפה|בתי ?ה?קפה|תוסס|תוססת|בוהמיינ|בוהמי|היפסטר|אמנותי|סצנה|אזור ?ה?צעיר|שכונה ?ה?צעיר|מקום ?ה?צעיר|צעיר ותוסס|nightlife|bars|pubs|clubs|hipster|trendy|bohemian/i],
  [SearchIntent.quiet,
    /שקט|שקטה|רגוע|רגועה|שלוו|שליו|פסטורל|מבוגר|גמלא|פנסי|קשיש|בלי רעש|ללא רעש|רחוק מרעש|נטול רעש|רחוק מכביש|רחוק מהרעש|retire|quiet|calm|peaceful|tranquil/i],
  [SearchIntent.central,
    /מרכזי|מרכזית|מרכז ?ה?עיר|לב ?ה?עיר|במרכז|סנטר|אזור ?ה?עסקים|מרכז ?ה?עסקים|מגדלי משרדים|central|downtown|business district/i],
  [SearchIntent.spacious, /מרווח|מרווחת|מרווחים|מרווחות|חדרים גדולים|גדולה מאוד|spacious/i],
  [SearchIntent.compact, /דירה קטנה|קטנטנה|קומפקט|להקטין|מקטינ|קן ריק|downsiz|empty.?nest|compact/i],
  [SearchIntent.accessible,
    /נגיש|נגישות|כיסא גלגלים|כסא גלגלים|מוגבלות|נכה|עגלה|wheelchair|accessible|step.?free/i],
  [SearchIntent.luxury, /יוקר|מפואר|פרימיום|luxur|penthouse|פנטהאוז/i],
  [SearchIntent.view, /נוף|קומה גבוה|פנטהאוז|view|penthouse/i],
  [SearchIntent.lowFloor,
    /קומה נמוכה|קומת קרקע|קומה ראשונה|קומה שנייה|קומה שניה|בלי מדרגות|ללא מדרגות|קרוב לכניסה|low floor|ground floor/i],
  [SearchIntent.student, /סטודנט|סטודנטית|קמפוס|מכלל|student|campus/i],
  [SearchIntent.nearUniversity, /אוניברסיט|קמפוס|מכלל|university|campus/i],
  [SearchIntent.investment, /השקע|תשוא|invest|yield|rental income/i],
  [SearchIntent.roommates, /שותפ|שותפות|roommate|flatmate/i],
  [SearchIntent.single,
    /רווק|רווקה|לגור לבד|גר לבד|גרה לבד|גר לבדי|מחפש לבד|לבד בדירה|\bsolo\b|\bsingle\b|living alone|on my own|by myself|young professional/i],
  [SearchIntent.couple,
    /זוג(?!\s*(נעל|גרב|מגפ|כפכף|גורב))|זוגי|בן ?ה?זוג|בת ?ה?זוג|בני ?ה?זוג|בזוגיות|נשואים טריים|couple|partner|spouse|two of us|newlywed/i],
  [SearchIntent.wfh,
    /עבודה מהבית|עובד מהבית|עובדת מהבית|חדר ?ה?עבודה|מהבית|רימוט|remote|wfh|work from home/i],
  [SearchIntent.goodSchools, /בתי ?ה?ספר|בית ?ה?ספר|חינוך|מוסדות ?ה?חינוך|schools?/i],
  [SearchIntent.qualityArea,
    /שכונה ?ה?טובה|אזור ?ה?טוב|אזור ?ה?איכותי|אזור ?ה?יוקרתי|שכונה ?ה?יוקרתית|שכונה ?ה?שקטה|מטופח|מטופחת|אזור ?ה?מבוקש|שכונה ?ה?מבוקש|מבוקשת|נחשב|נחשבת|שכונה ?בעלייה|בעלייה|אזור ?ה?מתפתח|מתפתח|מתפתחת|מתחדש|מתחדשת|שכונה ?ה?נקייה|אזור ?ה?נקי|good area|nice area|prime|up.and.coming|sought.after/i],
  [SearchIntent.safety,
    /בטוח|בטוחה|בטיחות|לא מסוכן|לא מסוכנת|בלי פשיעה|ללא פשיעה|פשיעה נמוכה|ללא אלימות|בלי אלימות|safe|low.crime|secure/i],
  [SearchIntent.transit,
    /תחבורה ציבורית|קרוב לתחבורה|נגיש לתחבורה|קרוב ל?ה?רכבת|ליד ?ה?רכבת|תחנת ?ה?רכבת|רכבת ?ה?קלה|קו אדום|קו סגול|מטרו|קרוב ל?ה?אוטובוס|ליד ?ה?אוטובוס|תחנת ?ה?אוטובוס|קרוב ל?ה?תחנה|public transport|near.*train|metro|light.rail|\bbus\b|transit|near transit|well.connected/i],
  [SearchIntent.employment,
    /קרוב לעבודה|ליד ?ה?עבודה|קרוב למקום ?ה?עבודה|אזור ?ה?תעסוקה|אזור ?ה?תעשייה|הייטק|היי[- ]?טק|פארק ?ה?הייטק|קרוב ל?ה?משרדים|ליד ?ה?משרדים|מרכז ?ה?עסקים|אזור ?ה?עסקים|קרוב לאזור ?ה?תעשייה|near work|close to work|tech park|business district|job hub|employment/i],
  [SearchIntent.green,
    /אזור ?ה?ירוק|הרבה ירוק|הרבה גינות|גינות|גינה ?ה?ציבורית|פארק|קרוב לפארק|גן ?ה?ציבורי|גנים ציבוריים|שטח ?ה?פתוח|אזור ?ה?פתוח|טבע|ריאות ירוקות|אוויר נקי|green|park|garden/i],
  [SearchIntent.health,
    /בית ?ה?חולים|קופת ?ה?חולים|מרפאה|קרוב לרפואה|שירותי בריאות|קרוב לבריאות|clinic|hospital|medical/i],
  [SearchIntent.youngPop,
    /אזור ?ה?צעיר|סביבה ?ה?צעיר|שכונה ?ה?צעיר|מקום ?ה?צעיר|אוכלוס\S* צעיר|אזור של צעירים|קהל ?ה?צעיר|הרבה צעירים|young (area|crowd|people|vibe)/i],
  [SearchIntent.convenience,
    /ליד ?ה?סופר|קרוב ל?ה?סופר|סופרמרקט|ליד ?ה?מכולת|מרכז ?ה?קניות|מרכזי ?ה?קניות|קניון|קרוב לקניות|ליד מרכז ?ה?מסחרי|מרכז ?ה?מסחרי|קרוב לחנויות|ליד ?ה?חנויות|supermarket|grocer|shopping|\bmall\b|errands/i],
  [SearchIntent.growth,
    /פוטנציאל|פוטנציאל השבחה|השבחה|פינוי בינוי|פינוי[- ]?בינוי|תמ[״"]?א|התחדשות עירונית|אזור ?ה?מתפתח|בעלייה|לפני עלייה|קרוב למטרו|מטרו עתידי|קו מטרו|רכבת ?ה?קלה עתידית|רק[״"]?ל עתיד|ערך עתידי|appreciation|upside|up.and.coming|future (metro|value)|urban renewal/i],
  [SearchIntent.religiousArea,
    /דתי|דתיה|דתיים|חרדי|חרדית|חרדים|שומר שבת|שומרי שבת|בית ?ה?כנסת|בתי ?ה?כנסת|קהילה ?ה?דתית|אזור ?ה?דתי|שכונה ?ה?דתית|מסורתי|מסורתית|כשר|מקווה|עירוב|ישיבה|אולפנה|תלמוד תורה|religious|synagogue|kosher|haredi|observant/i],
]

const INTENT_NEGATOR = /(בלי|ללא|לא ליד|לא רוצה|לא צריך|לא מעוניין|without|no)\s*$/

function intentNegated(text: string, matchStart: number): boolean {
  const from = matchStart - 14 < 0 ? 0 : matchStart - 14
  return INTENT_NEGATOR.test(text.substring(from, matchStart))
}

/** Port of SearchIntent.fromText — intents + Phase-2 life-stage inference. */
export function intentsFromText(rawText: string): Set<string> {
  if (!rawText.trim()) return new Set()
  const text = rawText.replace(/איזור/g, 'אזור')
  const out = new Set<string>()
  for (const [key, pattern] of INTENT_PATTERNS) {
    const m = pattern.exec(text)
    if (m && !intentNegated(text, m.index)) out.add(key)
  }
  // ── Phase 2: life-stage inference ──
  const emptyNest =
    /הילדים עזבו|הילדים גדלו|אחרי שהילדים|קן ריק|נשארנו לבד|הבית התרוקן|דירה קטנה יותר|empty nest/.test(text)
  if (!emptyNest && /משפח|ילד|תינוק|בהריון|הריון|פעוט|בייבי|family|kids|child|baby/.test(text)) {
    out.add(SearchIntent.goodSchools)
    out.add(SearchIntent.quiet)
    out.add(SearchIntent.spacious)
    out.add(SearchIntent.qualityArea)
  }
  if (emptyNest) {
    out.add(SearchIntent.quiet)
    out.add(SearchIntent.accessible)
  }
  if (!emptyNest) {
    if (/תינוק|פעוט|רך נולד|בהריון|הריון|גן ?ה?ילדים|ילד ?ה?קטן|ילדים ?ה?קטנים|בייבי|baby|toddler/.test(text)) {
      out.add(SearchIntent.youngChildren)
    }
    if (/מתבגר|מתבגרת|מתבגרים|נוער|גיל העשרה|בני ?ה?נוער|תיכון|teen/.test(text)) {
      out.add(SearchIntent.teens)
    }
  }
  const elderlyAge =
    /(?:בן|בת|גיל)\s*(6[5-9]|[7-9]\d|1\d\d)\b/.test(text) &&
    !/בניין|בית|מבנה|נכס/.test(text)
  if (elderlyAge || /מבוגר|גמלא|פנסי|קשיש|בגיל השלישי|retire|senior|elderly/.test(text)) {
    out.add(SearchIntent.accessible)
    out.add(SearchIntent.quiet)
  }
  if (/בלי רעש|ללא רעש|לא רוצה רעש|לא רועש|לא באזור רועש|לא בסביבה רועש|רחוק מרעש|רחוק מכביש|נטול רעש|no noise|away from.*(road|highway)/.test(text)) {
    out.add(SearchIntent.quiet)
  }
  if (/(?:לא|בלי|ללא)\s*קומה גבוה/.test(text)) {
    out.add(SearchIntent.lowFloor)
    out.delete(SearchIntent.view)
  }
  if (/זוג צעיר|זוג|בני זוג|נשואים טריים|couple|newlywed/.test(text)) {
    out.add(SearchIntent.central)
  }
  if (/עולה חדש|עולים חדשים|עולה חדשה|עלייה לארץ|עליתי לארץ|דובר אנגלית|דוברת אנגלית|דוברי אנגלית|אנגלו[- ]?סקסי|\banglo\b|\bolim\b|\boleh\b|new immigrant|english.speaking/i.test(text)) {
    out.add(SearchIntent.qualityArea)
    out.add(SearchIntent.goodSchools)
  }
  if (out.has(SearchIntent.student)) out.add(SearchIntent.nearUniversity)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 lexicon — Israeli everyday terms + abbreviations (smart_search.dart)
// ─────────────────────────────────────────────────────────────────────────────

const LEXICON: [RegExp, string][] = [
  [/תחב["״]?צ/g, ' תחבורה ציבורית '],
  [/רק["״]?ל/g, ' רכבת קלה '],
  [/שכ["״]?ד/g, ' שכר דירה '],
  [/יח["״]?ד/g, ' יחידת דיור '],
  [/ממ["״]?ד/g, ' ממ"ד '],
  [/ממ["״]?ק/g, ' מרחב מוגן '],
  [/ק["״]ק/g, ' קומת קרקע '],
  [/מ["״]ר/g, ' מטר '],
  [/חד['׳](?=\s|$)/g, ' חדרים '],
  [/צמוד[ותה]? קרקע/g, ' צמוד קרקע '],
  [/דו[- ]?משפחתי/g, ' דו משפחתי '],
  [/מרפסת\s*שמש/g, ' מרפסת שמש '],
  [/כ["״]?\s*מיידית/g, ' כניסה מיידית '],
  // City short-forms / nicknames → full CBS-resolvable names.
  [/ראשל["״]?צ|רשל["״]?צ|רשלצ|ראשלצ/g, ' ראשון לציון '],
  [/(?<!יום )(?<!ה)ראשון(?! לציון)/g, ' ראשון לציון '],
  [/פ["״]ת(?![א-ת])/g, ' פתח תקווה '],
  [/ר["״]ג(?![א-ת])/g, ' רמת גן '],
  [/ב["״]ש(?![א-ת])/g, ' באר שבע '],
  [/ת["״]א(?![א-ת])/g, ' תל אביב '],
  [/כ["״]ס(?![א-ת])/g, ' כפר סבא '],
  [/כפ["״]ס(?![א-ת])/g, ' כפר סבא '],
  [/י["״]ם(?![א-ת])/g, ' ירושלים '],
  [/ק["״]ש(?![א-ת])/g, ' קרית שמונה '],
  [/ק["״]ג(?![א-ת])/g, ' קרית גת '],
  [/ק["״]מ(?![א-ת])/g, ' קרית מלאכי '],
  // English city names (olim / English-speakers) → Hebrew.
  [/\btel[\s-]?aviv\b|\btlv\b/gi, ' תל אביב '],
  [/\bjerusalem\b/gi, ' ירושלים '],
  [/\bhaifa\b/gi, ' חיפה '],
  [/\bbeer[\s-]?sheva\b|\bbeersheba\b/gi, ' באר שבע '],
  [/\bnetanya\b/gi, ' נתניה '],
  [/\bherzl?iya\b|\bherzelia\b/gi, ' הרצליה '],
  [/\brishon(?:\s*le?[\s-]?zion)?\b/gi, ' ראשון לציון '],
  [/\bpeta[hc]\s*tik[vw]a\b/gi, ' פתח תקווה '],
  [/\bramat[\s-]?gan\b/gi, ' רמת גן '],
  [/\bgivatayim\b/gi, ' גבעתיים '],
  [/\bbat[\s-]?yam\b/gi, ' בת ים '],
  [/\bholon\b/gi, ' חולון '],
  [/\bre[hc]ovot\b/gi, ' רחובות '],
  [/\bkfar[\s-]?saba\b/gi, ' כפר סבא '],
  [/\bra.?anana\b/gi, ' רעננה '],
  [/\bmodi.?in\b/gi, ' מודיעין '],
  [/\bashdod\b/gi, ' אשדוד '],
  [/\bash[kq]elon\b/gi, ' אשקלון '],
  [/\beilat\b/gi, ' אילת '],
  [/\btiberias\b/gi, ' טבריה '],
  [/\bbnei[\s-]?brak\b/gi, ' בני ברק '],
]

export function expandLexicon(text: string): string {
  let out = text
  for (const [re, replacement] of LEXICON) out = out.replace(re, replacement)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword maps — verbatim from smart_search.dart
// ─────────────────────────────────────────────────────────────────────────────

const AMENITY_KEYWORDS: Record<string, string[]> = {
  feat_renovated: ['משופצ', 'שיפוץ', 'חדשה', 'renovated'],
  feat_pets: ['כלב', 'כלבה', 'חתול', 'חיית מחמד', 'חיות מחמד', 'pet', 'dog'],
  feat_parking: ['חניה', 'חנייה', 'חניית', 'חנית', 'parking', 'מכונית', 'רכב פרטי'],
  // ponytail: feat_accessible/feat_roommates rows (wheelchair, students) — the
  // keyword fixes present in the Dart.
  feat_accessible: ['נגיש', 'נגישות', 'כיסא גלגלים', 'כסא גלגלים', 'נכה', 'accessible', 'wheelchair', 'disabled'],
  feat_roommates: ['שותפים', 'שותף', 'שותפה', 'דירת שותפים', 'roommate', 'flatmate'],
  feat_balcony: ['מרפסת', 'מרפסות', 'balcony'],
  feat_elevator: ['מעלית', 'elevator'],
  feat_furnished: ['מרוהט', 'ריהוט', 'מאובזר', 'furnished'],
  feat_mamad: ['ממ"ד', 'ממד', 'ממ״ד', 'מקלט', 'mamad', 'shelter'],
  feat_garden: ['גינה', 'גינת', 'חצר', 'garden'],
  feat_air: ['מזגן', 'מיזוג', 'ממוזג', 'ac'],
  feat_pool: ['בריכה', 'pool'],
  feat_gym: ['חדר כושר', 'כושר', 'gym'],
  feat_storage: ['מחסן', 'storage'],
  feat_sun: ['שמש', 'מואר', 'אור'],
  feat_safe: ['ממוגן', 'סורגים'],
  feat_internet: ['אינטרנט', 'סיבים', 'wifi'],
  feat_laundry: ['מכונת כביסה', 'כביסה'],
}

const PROPERTY_TYPES: [string, string[]][] = [
  ['סטודיו', ['סטודיו', 'studio']],
  ['יחידת דיור', ['יחידת דיור', 'יחידה']],
  ['דירת גן', ['דירת גן', 'גן ']],
  ['פנטהאוז', ['פנטהאוז', 'פנטהאוס', 'penthouse']],
  ['דופלקס', ['דופלקס', 'duplex']],
  ['גג', ['דירת גג', 'גג']],
  ['דירה', ['דירה', 'apartment']],
]

const NOT_A_CITY_WORD = new Set([
  'ערך', 'בערך', 'ערכי', 'חדר', 'חדרים', 'דירה', 'דירת', 'בית', 'משהו',
  'שקט', 'שקטה', 'גדול', 'גדולה', 'קטן', 'קטנה', 'זול', 'זולה', 'יקר', 'יקרה',
  'נחמד', 'יפה', 'יפו', 'טוב', 'טובה', 'חדש', 'חדשה', 'ישן', 'מרכז', 'מרכזי',
  'קרוב', 'רחוק', 'צריך', 'רוצה', 'מחפש', 'מחפשת', 'לגור', 'עבודה', 'רכבת',
  'ילדים', 'ילד', 'משפחה', 'זוג', 'רווק', 'סטודנט', 'כלב', 'חתול', 'שנה',
])

const NEIGHBORHOODS: string[] = [
  'פלורנטין', 'נווה צדק', 'רוטשילד', 'כרם התימנים', 'לב העיר', 'הצפון הישן',
  'הצפון החדש', 'רמת אביב', 'בבלי', 'יד אליהו', 'רמת החייל', 'שפירא',
  'נחלת יצחק', 'תל ברוך', 'אפקה', 'מונטיפיורי', 'יפו', 'הקריה', 'נווה שאנן',
  'רחביה', 'בקעה', 'נחלאות', 'תלפיות', 'קטמון', 'גילה', 'פסגת זאב',
  'הדר', 'כרמל', 'נווה שאנן', 'ואדי ניסנס', 'רמות', 'קרית חיים',
  'רמת אביב ג', 'גבעת שמואל', 'מרכז העיר',
]

const NEIGHBORHOOD_CITY: Record<string, string> = {
  // Tel Aviv
  'פלורנטין': 'תל אביב', 'נווה צדק': 'תל אביב', 'רוטשילד': 'תל אביב',
  'כרם התימנים': 'תל אביב', 'לב העיר': 'תל אביב', 'הצפון הישן': 'תל אביב',
  'הצפון החדש': 'תל אביב', 'רמת אביב': 'תל אביב', 'רמת אביב ג': 'תל אביב',
  'בבלי': 'תל אביב', 'יד אליהו': 'תל אביב', 'רמת החייל': 'תל אביב',
  'שפירא': 'תל אביב', 'נחלת יצחק': 'תל אביב', 'תל ברוך': 'תל אביב',
  'אפקה': 'תל אביב', 'מונטיפיורי': 'תל אביב', 'יפו': 'תל אביב',
  // Jerusalem
  'רחביה': 'ירושלים', 'בקעה': 'ירושלים', 'נחלאות': 'ירושלים',
  'תלפיות': 'ירושלים', 'קטמון': 'ירושלים', 'גילה': 'ירושלים',
  'פסגת זאב': 'ירושלים', 'רמות': 'ירושלים',
  // Haifa
  'הדר': 'חיפה', 'כרמל': 'חיפה', 'ואדי ניסנס': 'חיפה', 'קרית חיים': 'חיפה',
}

/** Port of SmartSearch.amenityTag — the exact card-tag strings. */
export function amenityTag(key: string): string {
  switch (key) {
    case 'feat_renovated': return '✦ משופצת'
    case 'feat_pets': return '🐾 ידידותי לחיות'
    case 'feat_parking': return '🅿️ חניה'
    case 'feat_balcony': return '🌤️ מרפסת'
    case 'feat_elevator': return '🛗 מעלית'
    case 'feat_furnished': return '🛋️ מרוהט'
    case 'feat_mamad': return '🛡️ ממ״ד'
    case 'feat_garden': return '🌳 גינה'
    case 'feat_air': return '❄️ מיזוג'
    case 'feat_pool': return '🏊 בריכה'
    case 'feat_gym': return '🏋️ חדר כושר'
    case 'feat_storage': return '📦 מחסן'
    case 'feat_sun': return '☀️ מואר'
    case 'feat_safe': return '🔒 ממוגן'
    case 'feat_internet': return '🌐 אינטרנט'
    case 'feat_laundry': return '🧺 כביסה'
    case 'feat_accessible': return '♿ נגיש'
    case 'feat_roommates': return '👥 שותפים'
    default: return key.replace(/^feat_/, '')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Value helpers (smart_search.dart bottom)
// ─────────────────────────────────────────────────────────────────────────────

const WORD_TO_NUM: Record<string, number> = {
  'אחד': 1, 'אחת': 1, 'שני': 2, 'שתי': 2, 'שניים': 2, 'שתיים': 2,
  'שלוש': 3, 'שלושה': 3, 'תלת': 3, 'שלושת': 3,
  'ארבע': 4, 'ארבעה': 4, 'ארבעת': 4,
  'חמש': 5, 'חמישה': 5, 'חמשת': 5,
  'שש': 6, 'שישה': 6, 'ששת': 6,
  'שבע': 7, 'שבעה': 7, 'שבעת': 7,
  'שמונה': 8, 'שמונת': 8,
  'תשע': 9, 'תשעה': 9, 'תשעת': 9,
  'עשר': 10, 'עשרה': 10, 'עשרת': 10,
}

function wordToNum(w: string): number | null {
  const t = w.trim()
  if (t in WORD_TO_NUM) return WORD_TO_NUM[t]
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}

// ─────────────────────────────────────────────────────────────────────────────
// parseQuery — port of SmartSearch.parse (without the optional LLM overlay,
// which the website doesn't have — same as passing llm: {})
// ─────────────────────────────────────────────────────────────────────────────

// Everyday Israeli negation cues that mean "avoid this place" (word-guarded לא).
const LOC_NEG =
  /(?<![א-ת])לא(?![א-ת])|(?<![א-ת])בלי(?![א-ת])|ללא|רחוק\s*מ|חוץ\s*מ|מלבד|למעט|\bnot\b|without|avoid|except/i

const DIRECTIONS: Record<string, string> = {
  'דרום': 'דרום', 'צפון': 'צפון', 'מזרח': 'מזרח', 'מערב': 'מערב',
  'מרכז': 'מרכז', 'לב': 'מרכז',
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Port of SmartSearch._parseLocationModifiers.
function parseLocationModifiers(
  text: string,
  cityIn: string | null,
  neighborhoodIn: string | null,
): { city: string | null; neighborhood: string | null; excludeAreas: string[]; areaDir: string | null; areaDirExclude: boolean } {
  let city = cityIn
  let neighborhood = neighborhoodIn
  const excl: string[] = []

  const negatedBefore = (idx: number): boolean => {
    if (idx < 0) return false
    const from = idx - 14 < 0 ? 0 : idx - 14
    return LOC_NEG.test(text.substring(from, idx))
  }

  const firstWord = (place: string): string =>
    place.split(/[\s\-־]/).find((s) => s.length > 0) ?? place

  if (city !== null && negatedBefore(text.indexOf(firstWord(city)))) {
    excl.push(city)
    city = null
  }
  if (neighborhood !== null && negatedBefore(text.indexOf(neighborhood))) {
    excl.push(neighborhood)
    neighborhood = null
  }

  // Independent "<negation> <place>" scan.
  const negPhrase =
    /(?:לא|בלי|ללא|רחוק\s*מ|חוץ\s*מ|מלבד|למעט)\s+(?:ב|ל|ליד\s+|בא[יי]?זור\s+|רוצ\w+\s+ב?|מעוניינ?\w*\s+ב?)?([א-ת]{2,}(?:[\s\-]+[א-ת]{2,})?)/gi
  for (const m of text.matchAll(negPhrase)) {
    const phrase = m[1].trim()
    if (DIRECTIONS[phrase.split(/\s+/)[0]] !== undefined) continue
    const loc = findCbsLocalityInText(phrase)
    if (loc !== null) {
      if (!excl.includes(loc)) excl.push(loc)
      continue
    }
    const hand = ALL_LOCALITIES.find((l) => phrase.includes(l)) ?? ''
    if (hand) {
      if (!excl.includes(hand)) excl.push(hand)
      continue
    }
    for (const n of NEIGHBORHOODS) {
      if (phrase.includes(n) && !excl.includes(n)) {
        excl.push(n)
        break
      }
    }
  }

  // Direction: (ב/ה/מ/ל)?<dir> followed by "העיר" or the city's first word.
  let areaDir: string | null = null
  let areaDirExclude = false
  const cityFirst = city === null ? '' : escapeRegExp(firstWord(city))
  const anchor = cityFirst === '' ? 'ה?עיר' : `(?:ה?עיר|${cityFirst})`
  const dm = new RegExp('[בהמל]?(דרום|צפון|מזרח|מערב|מרכז|לב)\\s+' + anchor).exec(text)
  if (dm) {
    areaDir = DIRECTIONS[dm[1]] ?? null
    areaDirExclude = negatedBefore(dm.index)
  }

  return { city, neighborhood, excludeAreas: excl, areaDir, areaDirExclude }
}

// Port of SmartSearch._isAreaSearch.
function isAreaSearch(text: string, city: string | null): boolean {
  if (city === null || city === 'אזור') return false
  const parts = city.split(/[\s\-]/).filter((s) => s.length > 0)
  if (parts.length === 0) return false
  const first = parts[0]
  if (first.length < 2) return false
  const esc = escapeRegExp(first)
  if (new RegExp(`(אזור|איזור|בסביבות|סביבת)\\s*${esc}`).test(text)) return true
  if (new RegExp(`${esc}.{0,18}(והסביבה|וסביבתה|והאזור|וסביבותיה)`).test(text)) return true
  return false
}

/** Port of SmartSearch.parse — free Hebrew text → structured query. */
export function parseQuery(input: string): ParsedQuery {
  // Phase 1 — Israeli lexicon expansion.
  const text = expandLexicon(input)
  const t = text.toLowerCase()

  // ── rooms (range / half / studio / "+") ─────────────────────────────────
  let minRooms: number | null = null
  let maxRooms: number | null = null
  const roomRange = /(\d(?:\.\d)?)\s*[-־–]\s*(\d(?:\.\d)?)\s*(?:חדר|חד)/.exec(text)
  const roomBetween = /בין\s*(\d(?:\.\d)?)\s*ל[-־]?\s*(\d(?:\.\d)?)\s*(?:חדר|חד)/.exec(text)
  const uptoRooms = /(?:עד|מקסימום|מקס|לכל היותר)\s*(\d(?:\.\d)?)\s*(?:חדר|חדרים|חד)/.exec(text)
  const fromRooms = /(?:לפחות|מעל)\s*(\d(?:\.\d)?)\s*(?:חדר|חדרים|חד)/.exec(text)
  let single: RegExpExecArray | null = null
  if (uptoRooms) {
    maxRooms = parseFloat(uptoRooms[1])
  } else if (fromRooms) {
    minRooms = parseFloat(fromRooms[1])
  } else if (roomRange || roomBetween) {
    const m = (roomRange ?? roomBetween)!
    minRooms = parseFloat(m[1])
    maxRooms = parseFloat(m[2])
  } else {
    const half = /(\d|אחד|שני|שתי|שלוש|שלושה|ארבע|ארבעה|חמש|חמישה)\s*וחצי/.exec(text)
    single = /(\d(?:\.\d)?)\s*[-+]?\s*(?:חדר|חדרים|חד|rooms?|bedrooms?)/i.exec(text)
    if (half) {
      minRooms = (wordToNum(half[1]) ?? 0) + 0.5
    } else if (single) {
      minRooms = parseFloat(single[1])
    } else {
      const spelled =
        /(אחד|שני|שתי|שלוש|שלושה|תלת|ארבע|ארבעה|חמש|חמישה|שש|שישה|שבע|שבעה)\s*(?:חדר|חדרים)/.exec(text)
      if (spelled) minRooms = wordToNum(spelled[1])
    }
    // "חדר וחצי" = 1.5 rooms (no leading number).
    if (minRooms === null && /חדר\s*וחצי/.test(text)) minRooms = 1.5
    // "3+" → open-ended max.
    if (single && /\d\s*\+/.test(text)) maxRooms = null
  }
  if (minRooms !== null && !Number.isFinite(minRooms)) minRooms = null
  if (maxRooms !== null && !Number.isFinite(maxRooms)) maxRooms = null

  // Bare single room count → tight band [n, n+0.5].
  const bareSingle = !uptoRooms && !fromRooms && !roomRange && !roomBetween
  const openEnded = /\d\s*\+/.test(text)
  if (bareSingle && !openEnded && minRooms !== null && maxRooms === null) {
    maxRooms = minRooms + 0.5
  }

  // ── property type ───────────────────────────────────────────────────────
  let propertyType: string | null = null
  for (const [key, words] of PROPERTY_TYPES) {
    if (words.some((w) => t.includes(w))) {
      propertyType = key
      break
    }
  }
  if (propertyType === 'סטודיו' || propertyType === 'יחידת דיור') {
    maxRooms = maxRooms ?? 2
  }

  // ── budget (range / around / max / min, with "אלף") ─────────────────────
  let minPrice: number | null = null
  let maxPrice: number | null = null
  const amount = (s: string): number | null => {
    const mil = /(\d+(?:[.,]\d+)?)\s*מיליון/.exec(s)
    if (mil) {
      const base = parseFloat(mil[1].replace(',', '.')) || 0
      return Math.round(base * 1000000) + (s.includes('וחצי') ? 500000 : 0)
    }
    if (s.includes('מיליון')) return 1000000 + (s.includes('וחצי') ? 500000 : 0)
    const mShort = /(\d+(?:[.,]\d+)?)\s*(?:M|מ׳|מ״)/.exec(s)
    if (mShort) {
      const base = parseFloat(mShort[1].replace(',', '.')) || 0
      return Math.round(base * 1000000)
    }
    const e = /(\d+)\s*(וחצי\s*)?(?:אלף|אלפים)/.exec(s)
    if (e) return (parseInt(e[1], 10) || 0) * 1000 + (e[2] ? 500 : 0)
    const spelledK = /(שני|שתי|שלושת|תלת|ארבעת|חמשת|ששת|שבעת|שמונת|תשעת|עשרת)\s*אלפ/.exec(s)
    if (spelledK) {
      const n = wordToNum(spelledK[1])
      if (n !== null) return Math.round(n * 1000)
    }
    if (/(?<![א-ת])אלף(?![א-ת])/.test(s)) return 1000
    const n = /\d[\d,]{2,}/.exec(s.replace(/,/g, ''))
    if (n) {
      const v = parseInt(n[0], 10)
      return Number.isFinite(v) ? v : null
    }
    return null
  }

  const amt =
    '(\\d[\\d.,]*\\s*(?:אלף|אלפים|מיליון(?:\\s*וחצי)?|M|מ׳|מ״)?|מיליון(?:\\s*וחצי)?)'
  const between = new RegExp(`בין\\s*${amt}\\s*ל[-־]?\\s*${amt}`).exec(text)
  const around = new RegExp(`(?:בערך|סביב|כ[-־]|בסביבות)\\s*${amt}`).exec(text)
  const upto = new RegExp(`(?:עד|מקסימום|מקס|לכל היותר|מתחת ל[-־]?)\\s*${amt}`).exec(text)
  const from = new RegExp(`(?:מ[-־]|לפחות|מעל|החל מ[-־]?)\\s*${amt}`).exec(text)

  if (between) {
    minPrice = amount(between[1])
    maxPrice = amount(between[2])
  } else if (around) {
    const a = amount(around[1])
    if (a !== null && a >= 1500) {
      minPrice = Math.round(a * 0.85)
      maxPrice = Math.round(a * 1.15)
    }
  } else {
    if (upto) maxPrice = amount(upto[1])
    if (from) minPrice = amount(from[1])
    // Bare number: RENT band (1.5k–60k) OR clear SALE band (100k–30M).
    if (maxPrice === null && minPrice === null) {
      const any = amount(text)
      if (any !== null && ((any >= 1500 && any <= 60000) || (any >= 100000 && any <= 30000000))) {
        maxPrice = any
      }
    }
  }
  if (minPrice !== null && minPrice < 1500) minPrice = null
  if (maxPrice !== null && maxPrice < 1500) maxPrice = null

  // Cheapness signal — incl. vague no-number budget phrasing.
  const cheap =
    /זול|משתלם|במחיר טוב|כמה שפחות|תקציב (קטן|מוגבל|נמוך|צנוע)|מוגבל בתקציב|כסף מוגבל|לא הרבה כסף|תקציב מוגבל|חסכוני/.test(text)

  // ── rent vs. sale intent ─────────────────────────────────────────────────
  let transactionType: TransactionTypeFilter = 'any'
  if (/למכירה|למכור|לקנות|לרכוש|רכישה|מכירה|השקע|השקי|תשוא/.test(text)) {
    transactionType = 'sale'
  } else if (/להשכרה|לשכור|שכירות|להשכיר/.test(text)) {
    transactionType = 'rent'
  }
  // Price-magnitude inference: the amount decides when no explicit word.
  const monthly = /בחודש|לחודש|חודשי|שכ["׳’]?ד|שכר ?ה?דירה/.test(text)
  if (transactionType === 'any' && maxPrice !== null) {
    if (monthly || maxPrice < 100000) transactionType = 'rent'
    else if (maxPrice >= 500000) transactionType = 'sale'
  }

  // ── city & neighborhood ─────────────────────────────────────────────────
  // Strip deictic "my area / near me" phrases, collapse ktiv-male double-yod.
  const cityText = text
    .replace(
      /ה?א[יִ]?זור\s+(?:שלי|שלנו|הזה|הזאת)|בסביבה(?:\s+(?:שלי|שלנו|הזו))?|קרוב\s*אלי+|קרוב\s*אלינו|אצל[יי]|ליד[יי]|near me|around here|nearby|my area|close to me/g,
      ' ',
    )
    .replace(/ייה/g, 'יה')

  // FIRST: the CBS locality registry (top 200 inlined on web).
  let city: string | null = findCbsLocalityInText(cityText)
  if (city === null) {
    // Exact match on full multi-word hand-list localities.
    for (const locality of ALL_LOCALITIES) {
      if (cityText.includes(locality)) {
        city = locality
        break
      }
    }
    // Fuzzy scan, backwards, two-word phrase first.
    if (city === null) {
      const words = cityText.split(/[\s,،.!?؛]/).filter((w) => w.trim().length > 0)
      const stripPrefix = (w: string): string =>
        w.length > 1 && 'בלמכ'.includes(w[0]) ? w.substring(1) : w

      outer: for (let i = words.length - 1; i >= 0; i--) {
        if (i > 0) {
          const phrase = `${stripPrefix(words[i - 1])} ${stripPrefix(words[i])}`.toLowerCase().trim()
          if (phrase.length >= 3 && ALL_LOCALITIES.includes(phrase)) {
            city = phrase
            break
          }
          const phraseFuzzy: [string, number][] = []
          for (const locality of ALL_LOCALITIES) {
            if (phrase[0] !== locality[0]) continue
            if (Math.abs(phrase.length - locality.length) > 2) continue
            const dist = levenshtein(phrase, locality)
            if (dist <= 2) phraseFuzzy.push([locality, dist])
          }
          if (phraseFuzzy.length > 0) {
            phraseFuzzy.sort((a, b) => a[1] - b[1])
            city = phraseFuzzy[0][0]
            break
          }
        }

        const clean = stripPrefix(words[i]).toLowerCase().trim()
        if (!clean || clean.length < 3) continue
        if (NOT_A_CITY_WORD.has(clean)) continue

        if (ALL_LOCALITIES.includes(clean)) {
          city = clean
          break
        }

        // Space-LESS multi-word city: "תלאביב"→"תל אביב", "כפרסבא"→"כפר סבא".
        if (clean.length >= 4 && clean.length <= 10) {
          const raw = words[i].toLowerCase().trim()
          const jm = (name: string, cand: string): boolean => {
            if (cand.length < 4) return false
            if (!name.includes(' ') && !name.includes('-')) return false
            const joined = name.replace(/-/g, '').replace(/ /g, '')
            return (
              joined === cand ||
              (joined.length > 0 &&
                Math.abs(joined.length - cand.length) <= 1 &&
                joined[0] === cand[0] &&
                levenshtein(joined, cand) <= 1)
            )
          }
          const joinMatch = (name: string): boolean =>
            jm(name, clean) || (raw !== clean && jm(name, raw))

          for (const name of CBS_LOCALITIES) {
            if (joinMatch(name)) {
              city = name
              break outer
            }
          }
          for (const locality of ALL_LOCALITIES) {
            if (joinMatch(locality)) {
              city = locality
              break outer
            }
          }
        }

        // Fuzzy single word of 4-9 chars (dist ≤ 1, same first char, ±1 length).
        if (clean.length >= 4 && clean.length <= 9) {
          const fuzzyMatches: [string, number][] = []
          for (const locality of ALL_LOCALITIES) {
            if (clean[0] !== locality[0]) continue
            if (Math.abs(clean.length - locality.length) > 1) continue
            const dist = levenshtein(clean, locality)
            if (dist <= 1) fuzzyMatches.push([locality, dist])
          }
          if (fuzzyMatches.length > 0) {
            fuzzyMatches.sort((a, b) => a[1] - b[1])
            city = fuzzyMatches[0][0]
            break
          }
        }
      }
    }
  }

  let neighborhood: string | null = null
  for (const n of NEIGHBORHOODS) {
    if (text.includes(n)) {
      neighborhood = n
      break
    }
  }
  // A neighbourhood is NOT a city — resolve it to its parent city.
  if (neighborhood !== null) {
    const parent = NEIGHBORHOOD_CITY[neighborhood]
    if (parent !== undefined && (city === null || city === neighborhood)) {
      city = parent
    }
  }

  // ── location NEGATION + sub-city DIRECTION ───────────────────────────────
  const locMods = parseLocationModifiers(text, city, neighborhood)
  city = locMods.city
  neighborhood = locMods.neighborhood

  // ── amenities (keywords) ─────────────────────────────────────────────────
  const amenities = new Set<string>()
  for (const [key, words] of Object.entries(AMENITY_KEYWORDS)) {
    if (words.some((w) => t.includes(w.toLowerCase()))) amenities.add(key)
  }

  const nearTrain = [
    'רכבת', 'תחנת רכבת', 'ליד הרכבת', 'קרוב לרכבת', 'רכבת קלה',
    'train', 'railway', 'light rail', 'metro', 'תחבורה ציבורית',
    'אוטובוס', 'תחנת אוטובוס', 'קו אוטובוס', 'מטרו', 'תחנה מרכזית',
  ].some((w) => text.includes(w))

  // ── persona soft defaults (only when rooms not stated) ──────────────────
  if (minRooms === null && maxRooms === null) {
    const emptyNest =
      /הילדים עזבו|הילדים גדלו|אחרי שהילדים|קן ריק|נשארנו לבד|הבית התרוקן|דירה קטנה יותר/.test(text)
    if (/שותפ/.test(text)) {
      minRooms = 3
    } else if (/סטודנט/.test(text)) {
      minRooms = 1
      maxRooms = 2
    } else if (emptyNest) {
      minRooms = 2
    } else if (/(?<![א-ת])זוג|בני ?ה?זוג|נשואים טריים|מצפים לילד|תינוק בדרך|בהריון|הריון ראשון/.test(text)) {
      minRooms = 2
    } else if (/משפח|ילדים|ילד/.test(text)) {
      minRooms = 3
    }
  }

  // ── HARD requirements (dealbreakers → excluded, not down-ranked) ─────────
  const required = new Set<string>()
  if (
    amenities.has('feat_pets') ||
    /מאפשר.{0,8}חיות|אפשר.{0,12}חיות|מרשה.{0,8}חיות|ידידותי לכלב|עם כלב|יש לי כלב|יש לי חתול|pet.?friendly|dog.?friendly/.test(text)
  ) {
    required.add('petsAllowed')
  }
  if (
    /יש לי רכב|יש לי אוטו|יש לי מכונית|יש לי גם רכב|אני עם רכב|באתי עם רכב|עם הרכב|צריך חניה לרכב|יש לי ג׳יפ|i have a car|with a car|own a car|got a car/.test(text) &&
    !/אין לי רכב|בלי רכב|ללא רכב|no car|car.?free/.test(text)
  ) {
    required.add('parking')
    amenities.add('feat_parking')
  }
  if (/חייב|חובה|מוכרח|הכרחי|בהכרח|רק עם|חשוב שיהיה|חשוב לי ש|חשוב ש|צריך שיהיה|must have|required/.test(text)) {
    const canon: Record<string, string> = {
      feat_elevator: 'elevator',
      feat_parking: 'parking',
      feat_balcony: 'balcony',
      feat_mamad: 'mamad',
      feat_furnished: 'furnished',
      feat_ac: 'ac',
      feat_storage: 'storage',
      feat_accessible: 'accessible',
      feat_pets: 'petsAllowed',
    }
    for (const [featKey, canonKey] of Object.entries(canon)) {
      if (amenities.has(featKey)) required.add(canonKey)
    }
  }

  const intents = intentsFromText(text)
  if (isAreaSearch(text, city)) intents.add(SearchIntent.cityArea)

  return {
    city,
    neighborhood,
    excludeAreas: locMods.excludeAreas,
    areaDir: locMods.areaDir,
    areaDirExclude: locMods.areaDirExclude,
    minPrice,
    maxPrice,
    minRooms,
    maxRooms,
    propertyType,
    amenities,
    requiredFeatures: required,
    nearTrain,
    cheapPreference: cheap,
    transactionType,
    rawText: text,
    intents,
  }
}

/** Port of SearchQuery.isEmpty. */
export function queryIsEmpty(q: ParsedQuery): boolean {
  return (
    q.city === null &&
    q.neighborhood === null &&
    q.minPrice === null &&
    q.maxPrice === null &&
    q.minRooms === null &&
    q.maxRooms === null &&
    q.propertyType === null &&
    q.amenities.size === 0 &&
    !q.nearTrain
  )
}

/** Port of SearchQuery.hasEssentials. */
export function queryHasEssentials(q: ParsedQuery): boolean {
  return (
    q.city !== null ||
    q.neighborhood !== null ||
    q.maxPrice !== null ||
    q.minPrice !== null ||
    q.minRooms !== null ||
    q.propertyType !== null ||
    q.transactionType !== 'any'
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Web-property adapters — bridge the API Property shape to what the Dart engine
// reads (featureFlags / transactionType / marketSignals).
// Canonical feat_* → catalogue key map ported from engine/feature_engineering.dart
// (the Dart's own fix for the legacy feat_* isEnabled bug).
// ─────────────────────────────────────────────────────────────────────────────

const FEAT_ALIAS_TO_CATALOG_KEY: Record<string, string> = {
  feat_renovated: 'renovated',
  feat_pets: 'petsAllowed',
  feat_parking: 'parking',
  feat_balcony: 'balcony',
  feat_elevator: 'elevator',
  feat_furnished: 'furnished',
  feat_mamad: 'mamad',
  feat_garden: 'garden',
  feat_air: 'airConditioning',
  feat_pool: 'pool',
  feat_gym: 'gym',
  feat_storage: 'storage',
  feat_sun: 'sunBalcony',
  feat_safe: 'bars',
  feat_internet: 'internetIncluded',
  feat_laundry: 'washingMachine',
  feat_accessible: 'accessible',
  feat_roommates: 'roommates',
}

// Catalogue key ↔ Hebrew label pairs (rental_models.dart _propertyFeatureCatalog),
// so a features/featureLabels array of Hebrew labels resolves to catalogue keys.
const CATALOG_LABEL_TO_KEY: Record<string, string> = {
  'מרפסת': 'balcony', 'חניה': 'parking', 'מחסן': 'storage', 'מזגן': 'airConditioning',
  'ממ"ד': 'mamad', 'ממ״ד': 'mamad', 'מרפסת שמש': 'sunBalcony', 'גינה': 'garden',
  'מעלית': 'elevator', 'ריהוט': 'furnished', 'אינטרנט כלול': 'internetIncluded',
  'מטבח מאובזר': 'equippedKitchen', 'חיות מחמד מותר': 'petsAllowed',
  'מתאים לחיות מחמד': 'petsAllowed', 'כביסה כלולה': 'laundryIncluded',
  'שומר/אבטחה': 'security', 'נגישות לנכים': 'accessible', 'גג משותף': 'sharedRoof',
  'בריכה': 'pool', 'חדר כושר': 'gym', 'סורגים': 'bars', 'משופצת': 'renovated',
  'מתאימה לשותפים': 'roommates', 'מקלט': 'bombShelter', 'מכונת כביסה': 'washingMachine',
  'אזור שקט': 'quietArea', 'אור טבעי': 'naturalLight', 'קרוב לים': 'nearSea',
  'קרוב לפארק': 'nearPark', 'קרוב לתחבורה ציבורית': 'publicTransport',
}

function normalizeFeatureToken(value: string): string {
  return value.trim().toLowerCase().replace(/״/g, '"').replace(/['"]/g, '')
}

const NORMALIZED_LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(CATALOG_LABEL_TO_KEY).map(([label, key]) => [normalizeFeatureToken(label), key]),
)

/** The set of enabled catalogue feature keys for a web property. */
function enabledFeatureKeys(p: Property): Set<string> {
  const out = new Set<string>()
  const add = (token: string) => {
    const norm = normalizeFeatureToken(token)
    const viaLabel = NORMALIZED_LABEL_TO_KEY[norm]
    if (viaLabel) out.add(viaLabel)
    else if (token.startsWith('feat_')) out.add(FEAT_ALIAS_TO_CATALOG_KEY[token] ?? token)
    else out.add(token)
  }
  const f = p.features
  if (Array.isArray(f)) {
    for (const item of f) if (typeof item === 'string') add(item)
  } else if (f && typeof f === 'object') {
    for (const [key, val] of Object.entries(f)) {
      // API rows sometimes carry 1/'true' instead of a boolean (same leniency
      // as the Dart _asBoolFlag).
      const v = val as unknown
      if (v === true || v === 1 || v === 'true') add(key)
    }
  }
  for (const label of p.featureLabels ?? []) add(label)
  return out
}

/** Port of propertyHasFeature (feature_engineering.dart) — accepts feat_* keys. */
export function propertyHasFeature(p: Property, key: string): boolean {
  const canonical = FEAT_ALIAS_TO_CATALOG_KEY[key] ?? key
  return enabledFeatureKeys(p).has(canonical)
}

function isSale(p: Property): boolean {
  return (p.transactionType ?? 'rent') === 'sale'
}

function matchesTransactionType(p: Property, q: ParsedQuery): boolean {
  if (q.transactionType === 'any') return true
  return q.transactionType === 'sale' ? isSale(p) : !isSale(p)
}

/** Port of SmartSearch.applyTransactionFilter — hard rent/sale gate. */
export function applyTransactionFilter(props: Property[], q: ParsedQuery): Property[] {
  if (q.transactionType === 'any') return props
  return props.filter((p) => matchesTransactionType(p, q))
}

// ── city gate — port of recommendation_orchestrator._normCity/_cityMatches ──
// The CBS registry resolves "תל אביב" → "תל אביב - יפו" while listings store
// "תל אביב"; the Dart engine bridges that with normalized whole-word-prefix
// matching ("תל אביב" ⊂ "תל אביב יפו", but "יבנה" ≠ "גן יבנה").

function normCity(s: string): string {
  return s.trim().replace(/[-־]/g, ' ').replace(/\s+/g, ' ')
}

function cityNameMatch(a: string, b: string): boolean {
  if (a === b) return true
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a
  return longer.startsWith(`${shorter} `)
}

function cityMatches(p: Property, city: string): boolean {
  const q = normCity(city)
  if (!q) return false
  const pc = normCity(p.city ?? '')
  if (pc && cityNameMatch(pc, q)) return true
  const nb = normCity(p.neighborhood ?? '')
  return nb.length > 0 && cityNameMatch(nb, q)
}

function isVerifiedListing(p: Property): boolean {
  return (p as Property & { verified?: boolean }).verified === true
}

function hasImage(p: Property): boolean {
  return Boolean(p.imageUrls?.length || (Array.isArray(p.media) && p.media.length))
}

// ─────────────────────────────────────────────────────────────────────────────
// Train stations (approx coords) + haversine — verbatim from smart_search.dart
// ─────────────────────────────────────────────────────────────────────────────

const STATIONS: [string, number, number][] = [
  ['תל אביב סבידור מרכז', 32.0833, 34.7991],
  ['תל אביב השלום', 32.0734, 34.792],
  ['תל אביב ההגנה', 32.054, 34.794],
  ['תל אביב אוניברסיטה', 32.114, 34.804],
  ['הרצליה', 32.166, 34.834],
  ['נתניה', 32.318, 34.857],
  ['רעננה מערב', 32.182, 34.851],
  ['כפר סבא נורדאו', 32.167, 34.916],
  ['פתח תקווה קריית אריה', 32.103, 34.857],
  ['בני ברק', 32.093, 34.834],
  ['ראשון לציון הראשונים', 31.962, 34.806],
  ['רחובות', 31.917, 34.797],
  ['לוד', 31.948, 34.872],
  ['רמלה', 31.928, 34.864],
  ['מודיעין מרכז', 31.901, 35.007],
  ['בית שמש', 31.747, 34.988],
  ['ירושלים יצחק נבון', 31.787, 35.203],
  ['אשדוד עד הלום', 31.77, 34.661],
  ['אשקלון', 31.652, 34.578],
  ['באר שבע מרכז', 31.243, 34.798],
  ['חיפה חוף הכרמל', 32.794, 34.957],
  ['חיפה בת גלים', 32.831, 34.989],
  ['חיפה מרכז השמונה', 32.821, 35.0],
]

const rad = (d: number): number => (d * Math.PI) / 180

function haversineKm(la1: number, lo1: number, la2: number, lo2: number): number {
  const r = 6371.0
  const dLa = rad(la2 - la1)
  const dLo = rad(lo2 - lo1)
  const a =
    Math.sin(dLa / 2) * Math.sin(dLa / 2) +
    Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLo / 2) * Math.sin(dLo / 2)
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestStationKm(lat: number, lon: number): number | null {
  if (!lat || !lon) return null
  let best: number | null = null
  for (const [, sla, slo] of STATIONS) {
    const d = haversineKm(lat, lon, sla, slo)
    if (best === null || d < best) best = d
  }
  return best
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

// ─────────────────────────────────────────────────────────────────────────────
// Simple scorer — port of SmartSearch._score (tags + score + exact)
// ─────────────────────────────────────────────────────────────────────────────

function scoreSimple(p: Property, q: ParsedQuery): ScoredWebProperty {
  let s = 1
  const tags: string[] = []
  let exact = true

  // location
  const hay = `${p.city ?? ''} ${p.neighborhood ?? ''} ${p.street ?? ''}`
  if (q.neighborhood !== null) {
    if (hay.includes(q.neighborhood)) {
      s += 7
      tags.push(`📍 ${p.neighborhood?.length ? p.neighborhood : q.neighborhood}`)
    } else {
      s -= 3
      exact = false
    }
  }
  if (q.city !== null) {
    // Dart _score uses hay.contains(city); the engine's normalized city gate
    // (_cityMatches) is needed on web because the CBS registry returns names
    // like "תל אביב - יפו" while listings store "תל אביב".
    if (hay.includes(q.city) || cityMatches(p, q.city)) s += 5
    else {
      s -= 4
      exact = false
    }
  }

  // property type
  if (q.propertyType !== null) {
    const pt = p.propertyType ?? ''
    if (pt.includes(q.propertyType) || q.propertyType.includes(pt)) s += 3
    else {
      s -= 1.5
      exact = false
    }
  }

  // budget (min/max range)
  if (p.price > 0) {
    if (q.maxPrice !== null) {
      if (p.price <= q.maxPrice) s += 3
      else {
        const over = (p.price - q.maxPrice) / q.maxPrice
        s -= over > 0.5 ? 5 : over * 6
        if (over > 0.1) exact = false
      }
    }
    if (q.minPrice !== null && p.price < q.minPrice) s -= 1.5
    if (q.cheapPreference && q.maxPrice !== null && q.maxPrice > 0) {
      s += clamp(1 - p.price / q.maxPrice, 0, 1) * 2
    }
  }

  // rooms (min/max range)
  if (q.minRooms !== null || q.maxRooms !== null) {
    const lo = q.minRooms ?? 0
    const hi = q.maxRooms ?? 99
    const rooms = p.rooms ?? 0
    if (rooms >= lo - 0.5 && rooms <= hi + 0.5) s += 3
    else if (rooms < lo) {
      s -= 1.2 * (lo - rooms)
      exact = false
    } else {
      s -= 0.5 * (rooms - hi)
    }
  }

  // amenities — soft boosts
  for (const key of q.amenities) {
    if (propertyHasFeature(p, key)) {
      s += 2
      tags.push(amenityTag(key))
    } else {
      s -= 0.4
    }
  }

  // train proximity — soft boost
  let trainKm: number | null = null
  if (p.lat !== 0 && p.lon !== 0) {
    trainKm = nearestStationKm(p.lat, p.lon)
    if (q.nearTrain && trainKm !== null) {
      if (trainKm < 1.0) {
        s += 4
        tags.push(`🚉 ~${Math.round(trainKm * 12)} דק׳ מהרכבת`)
      } else if (trainKm < 2.5) {
        s += 2
        tags.push(`🚉 ${trainKm.toFixed(1)} ק״מ מהרכבת`)
      } else {
        s -= 1
      }
    }
  }

  // smarter tie-breakers: popularity + freshness + verified.
  // (Web API property carries no marketSignals/createdAt — same as a Dart
  // property with zero engagement and null createdAt: both boosts are 0.)
  if (isVerifiedListing(p)) s += 0.5

  return { property: p, score: s, tags, reasons: [], trainKm, exact }
}

// ─────────────────────────────────────────────────────────────────────────────
// AdvancedMatcher — port of advanced_matcher.dart (the legacy multi-dimensional
// matcher SmartSearch.rankAdvanced falls back to)
// ─────────────────────────────────────────────────────────────────────────────

interface UserIntentVector {
  locationDesirability: number
  priceElasticity: number
  sizePreference: number
  luxuryTolerance: number
  timePreference: number
  neighborhoodVibe: number
  travelWeight: number
  verificationWeight: number
  budgetFlexibility: number
}

function buildUserIntent(q: ParsedQuery): UserIntentVector {
  const statedCityPreference = q.city !== null
  const cheapPreference = q.cheapPreference
  const minPrice = q.minPrice
  const maxPrice = q.maxPrice
  const roomsRangeStated = q.minRooms !== null || q.maxRooms !== null
  const amenitiesCount = q.amenities.size
  const amenityDemanding = amenitiesCount > 2
  const nearTrainRequired = q.nearTrain

  const locationDesirability = statedCityPreference ? 0.85 : 0.4
  const priceElasticity = cheapPreference ? 0.2 : minPrice !== null && maxPrice !== null ? 0.4 : 0.65
  const sizePreference = roomsRangeStated ? 0.0 : -0.1
  const luxuryTolerance = amenitiesCount > 3 ? 0.75 : 0.45
  const timePreference = 0.0 // urgentTone / flexibleTone: false in the Dart call
  const travelWeight = nearTrainRequired ? 0.8 : 0.3
  const verificationWeight = statedCityPreference && amenityDemanding ? 0.7 : 0.4
  const budgetFlexibility = cheapPreference ? 0.15 : 0.4
  const neighborhoodVibe = timePreference > 0 ? 0.5 : -0.2

  return {
    locationDesirability, priceElasticity, sizePreference, luxuryTolerance,
    timePreference, neighborhoodVibe, travelWeight, verificationWeight,
    budgetFlexibility,
  }
}

interface PropertyVector {
  locationScore: number
  valueScore: number
  sizeNormalized: number
  amenityRichness: number
  trendingScore: number
  freshnessScore: number
  vibeFit: number
  distanceToTransit: number
  verifiedScore: number
}

const CITY_WEIGHTS: Record<string, number> = {
  'תל אביב': 0.95, 'ירושלים': 0.85, 'חיפה': 0.8, 'רמת גן': 0.9,
  'גבעתיים': 0.88, 'הרצליה': 0.75,
}
const NEIGHBORHOOD_WEIGHTS: Record<string, number> = {
  'נווה צדק': 0.95, 'פלורנטין': 0.93, 'רוטשילד': 0.92, 'כרם התימנים': 0.9,
  'רמת אביב': 0.85, 'הקריה': 0.8,
}

function locationScoreOf(city: string, neighborhood: string): number {
  let score = CITY_WEIGHTS[city] ?? 0.5
  if (neighborhood.length > 0) {
    const neighScore = NEIGHBORHOOD_WEIGHTS[neighborhood]
    if (neighScore !== undefined) score = (score + neighScore) / 2
  }
  return clamp(score, 0, 1)
}

function valueScoreOf(price: number, rooms: number, medianPrice: number): number {
  if (price <= 0 || rooms <= 0) return 0.4
  const pricePerRoom = price / rooms
  const marketPricePerRoom = medianPrice / 3
  const ratio = pricePerRoom / marketPricePerRoom
  return clamp(1 - clamp(ratio - 1, 0, 1), 0, 1)
}

function normalizeRooms(rooms: number, min: number, max: number): number {
  if (max <= min) return 0.0
  return ((rooms - min) / (max - min)) * 2 - 1
}

const VIBRANCY: Record<string, number> = {
  'נווה צדק': 0.9, 'פלורנטין': 0.95, 'רוטשילד': 0.85, 'כרם התימנים': 0.8,
  'תל אביב': 0.7,
}
const QUIET_AREAS: Record<string, number> = {
  'רמת אביב': -0.7, 'גבעתיים': -0.75, 'בני ברק': -0.6,
}

function vibeScoreOf(neighborhood: string, city: string): number {
  if (neighborhood in QUIET_AREAS) return QUIET_AREAS[neighborhood]
  if (neighborhood in VIBRANCY) return VIBRANCY[neighborhood]
  return city === 'תל אביב' ? 0.5 : -0.2
}

const ADVANCED_AMENITY_KEYS = [
  'feat_renovated', 'feat_pets', 'feat_parking', 'feat_balcony', 'feat_elevator',
  'feat_furnished', 'feat_mamad', 'feat_garden', 'feat_air', 'feat_gym',
]

function buildPropertyVector(
  p: Property,
  minRoomMarket: number,
  maxRoomMarket: number,
  medianPriceMarket: number,
): PropertyVector {
  const locationScore = locationScoreOf(p.city ?? '', p.neighborhood ?? '')
  const valueScore = valueScoreOf(p.price, p.rooms ?? 0, medianPriceMarket)
  const sizeNormalized = normalizeRooms(p.rooms ?? 0, minRoomMarket, maxRoomMarket)
  const enabled = ADVANCED_AMENITY_KEYS.filter((k) => propertyHasFeature(p, k)).length
  const amenityRichness = enabled / 10
  // Web property has no marketSignals → engagement 0 → trending 0 (same as Dart).
  const trendingScore = 0.0
  // Dart: createdAt ?? DateTime.now() → age 0 days → freshness (1-0)*0.8 = 0.8.
  const freshnessScore = 0.8
  const vibeFit = vibeScoreOf(p.neighborhood ?? '', p.city ?? '')
  const distanceToTransit = nearestStationKm(p.lat, p.lon) ?? 5.0
  const verifiedScore = (isVerifiedListing(p) ? 0.6 : 0.2) + (hasImage(p) ? 0.3 : 0.0)

  return {
    locationScore, valueScore, sizeNormalized, amenityRichness, trendingScore,
    freshnessScore, vibeFit, distanceToTransit, verifiedScore,
  }
}

interface MatchScoreResult {
  totalScore: number
  fitPct: number
  explanation: string
  reasons: string[]
}

// Port of AdvancedMatcher.scoreMatch (cosine + weighted distance metric).
function scoreMatch(
  intent: UserIntentVector,
  propVec: PropertyVector,
  meetsHardConstraints: boolean,
  hasRequestedAmenities: boolean,
  transitProximity: boolean,
): MatchScoreResult {
  const map: Record<string, number> = {}
  const baseMultiplier = meetsHardConstraints ? 1.0 : 0.6

  // 1. location alignment
  let locationScore = 0
  if (intent.locationDesirability > 0.7) locationScore = propVec.locationScore * 0.85
  else if (intent.locationDesirability < 0.5) locationScore = 0.5
  map.location = locationScore

  // 2. price-value fit
  const priceDot = intent.priceElasticity * propVec.valueScore
  let priceScore = (priceDot + 1) / 2
  if (!meetsHardConstraints) priceScore *= 0.5
  map.price = priceScore

  // 3. size fit
  const sizeDot = intent.sizePreference * propVec.sizeNormalized
  map.size = (sizeDot + 1) / 2

  // 4. amenity fit
  let amenityScore: number
  if (intent.luxuryTolerance > 0.6 && propVec.amenityRichness > 0.5) amenityScore = 0.85
  else if (hasRequestedAmenities) amenityScore = 0.75
  else amenityScore = 0.4
  map.amenities = amenityScore

  // 5. trending + freshness
  let trendScore: number
  if (intent.timePreference > 0.5) trendScore = (propVec.trendingScore + propVec.freshnessScore) / 2
  else if (intent.timePreference < -0.5) trendScore = propVec.freshnessScore * 0.9
  else trendScore = propVec.freshnessScore * 0.5
  map.trending_fresh = trendScore

  // 6. neighborhood vibe fit
  map.neighborhood_vibe = (intent.neighborhoodVibe * propVec.vibeFit + 1) / 2

  // 7. transit
  let transitScore: number
  if (intent.travelWeight > 0.6) {
    if (transitProximity && propVec.distanceToTransit < 1.5) transitScore = 0.95
    else if (propVec.distanceToTransit < 3) transitScore = 0.7
    else transitScore = 0.3
  } else {
    transitScore = 0.5
  }
  map.transit = transitScore

  // 8. verification trust
  map.verification = clamp(
    intent.verificationWeight * propVec.verifiedScore + (1 - intent.verificationWeight) * 0.5,
    0, 1,
  )

  // weighted average
  const weights: Record<string, number> = {
    location: intent.locationDesirability,
    price: 1.0,
    size: Math.abs(intent.sizePreference) + 0.5,
    amenities: intent.luxuryTolerance,
    trending_fresh: 0.6,
    neighborhood_vibe: Math.abs(intent.neighborhoodVibe) + 0.3,
    transit: intent.travelWeight,
    verification: intent.verificationWeight,
  }
  let totalScore = 0
  let weightSum = 0
  for (const [k, w] of Object.entries(weights)) {
    if (k in map) {
      totalScore += map[k] * w
      weightSum += w
    }
  }
  const normalizedScore = weightSum > 0 ? totalScore / weightSum : 0.5
  const finalScore = clamp(normalizedScore * baseMultiplier * 100, 0, 100)
  const fitPct = Math.round(finalScore)

  // explanation — verbatim AdvancedMatcher strings
  const reasons: string[] = []
  if (map.price > 0.75) reasons.push('excellent price-to-value')
  if (map.size > 0.8) reasons.push('perfect size')
  if (map.amenities > 0.8) reasons.push('feature-rich')
  if (map.trending_fresh > 0.75) reasons.push('popular & recent')
  if (map.transit > 0.8) reasons.push('great transit access')
  if (map.verification > 0.8) reasons.push('verified & trusted')
  const explanation = reasons.length > 0 ? reasons.join(', ') : 'solid match across dimensions'

  return { totalScore: finalScore, fitPct, explanation, reasons }
}

// Port of SmartSearch._checksConstraints.
function checksConstraints(p: Property, q: ParsedQuery): boolean {
  if (!matchesTransactionType(p, q)) return false
  // Dart uses p.city.contains(q.city); the normalized engine gate is added so
  // CBS-resolved names ("תל אביב - יפו") match listing rows ("תל אביב").
  if (q.city !== null && !(p.city ?? '').includes(q.city) && !cityMatches(p, q.city)) return false
  if (q.maxPrice !== null && p.price > q.maxPrice) return false
  if (q.minPrice !== null && p.price < q.minPrice) return false
  if (q.minRooms !== null && (p.rooms ?? 0) < q.minRooms) return false
  if (q.maxRooms !== null && (p.rooms ?? 0) > q.maxRooms) return false
  return true
}

// Port of SmartSearch._hasAmenities.
function hasAmenities(p: Property, q: ParsedQuery): boolean {
  for (const a of q.amenities) if (propertyHasFeature(p, a)) return true
  return false
}

// Port of SmartSearch._rankAdvancedLegacy (the resilient advanced matcher).
function rankAdvancedLegacy(props: Property[], q: ParsedQuery, limit: number): ScoredWebProperty[] {
  if (props.length === 0) return []

  // Market statistics for normalization
  const medianPrice = props.reduce((a, b) => a + b.price, 0) / props.length
  const minRooms = Math.min(...props.map((p) => p.rooms ?? 0))
  const maxRooms = Math.max(...props.map((p) => p.rooms ?? 0))

  const intent = buildUserIntent(q)

  const matches = props.map((p) => {
    const propVec = buildPropertyVector(p, minRooms, maxRooms, medianPrice)
    const meetsHardConstraints = checksConstraints(p, q)
    const hasRequested = hasAmenities(p, q)
    const transitProx = q.nearTrain && (nearestStationKm(p.lat, p.lon) ?? 10) < 2.5
    const detail = scoreMatch(intent, propVec, meetsHardConstraints, hasRequested, transitProx)
    // The card tags come from the simple scorer — the exact Hebrew strings the
    // Dart _score emits (📍 / 🚉 / amenity); the Dart legacy path prepends
    // 'NN% fit' + '✨ explanation', carried here as matchPct + reasons.
    const simple = scoreSimple(p, q)
    return {
      scored: {
        property: p,
        score: detail.totalScore / 100,
        tags: simple.tags,
        reasons: detail.reasons.length > 0 ? detail.reasons : [detail.explanation],
        matchPct: detail.fitPct,
        trainKm: nearestStationKm(p.lat, p.lon),
        exact: meetsHardConstraints,
      } as ScoredWebProperty,
      total: detail.totalScore,
    }
  })

  matches.sort((a, b) => b.total - a.total)
  return matches.slice(0, limit).map((m) => m.scored)
}

// ─────────────────────────────────────────────────────────────────────────────
// LifestyleKnowledge — port of lifestyle_knowledge.dart (religiosity area fit,
// applied by the app's fast path via _rankByLifestyle)
// ─────────────────────────────────────────────────────────────────────────────

type Religiosity = 'secular' | 'traditional' | 'religious' | 'haredi'
type AreaChar = 'secular' | 'mixed' | 'religious' | 'haredi'

export function detectReligiosity(rawText: string): Religiosity | null {
  const t = rawText.toLowerCase()
  const hasAny = (needles: string[]) => needles.some((n) => t.includes(n))
  if (hasAny(['חילוני', 'חילונית', 'חילונים', 'לא דתי', 'לא-דתי', 'לא שומר', 'לא שומרת', 'חופשי'])) {
    return 'secular'
  }
  if (hasAny(['חרדי', 'חרדית', 'חרדים', 'ליטאי', 'ליטאית', 'חסידי', 'חסיד', 'חסידית', 'אברך', 'בני תורה'])) {
    return 'haredi'
  }
  if (hasAny(['דתי לאומי', 'דתי-לאומי', 'דתייה', 'דתיה', 'דתיים', 'דתית', 'דתי', 'סרוג', 'כיפה', 'שומר שבת', 'שומרת שבת', 'שומרי שבת', 'שומר מצוות', 'שומרת מצוות', 'שומר תורה', 'אורתודוקס'])) {
    return 'religious'
  }
  if (hasAny(['מסורתי', 'מסורתית', 'מסורתיים', 'מסורת'])) return 'traditional'
  return null
}

const AREA_BY_NAME: Record<string, AreaChar> = {
  // ── Haredi towns / neighbourhoods ──
  'בני ברק': 'haredi', 'מודיעין עילית': 'haredi', 'קרית ספר': 'haredi',
  'ביתר עילית': 'haredi', 'אלעד': 'haredi', 'עמנואל': 'haredi', 'רכסים': 'haredi',
  'מאה שערים': 'haredi', 'הר נוף': 'haredi', 'רמת שלמה': 'haredi',
  'גבעת שאול': 'haredi', 'סנהדריה': 'haredi', 'רמות אלון': 'haredi',
  'נווה יעקב': 'haredi', 'קרית הרצוג': 'haredi', 'פרדס כץ': 'haredi',
  "קרית ויז'ניץ": 'haredi',
  // ── Religious-Zionist (דתי-לאומי) ──
  'אפרת': 'religious', 'אלון שבות': 'religious', 'כרמי צור': 'religious',
  'קרני שומרון': 'religious', 'בית אל': 'religious', 'עפרה': 'religious',
  'שילה': 'religious', 'קדומים': 'religious', 'גוש עציון': 'religious',
  'כוכב יעקב': 'religious', 'טלמון': 'religious', 'עלי': 'religious',
  'רבבה': 'religious', 'נוקדים': 'religious', 'גבעת שמואל': 'religious',
  'קרית ארבע': 'religious',
  // ── Secular ──
  'תל אביב': 'secular', 'תל אביב-יפו': 'secular', 'פלורנטין': 'secular',
  'נווה צדק': 'secular', 'רמת אביב': 'secular', 'לב תל אביב': 'secular',
  'שינקין': 'secular', 'הצפון הישן': 'secular', 'גבעתיים': 'secular',
  'רמת השרון': 'secular', 'כרמל': 'secular', 'רמת אביב ג': 'secular',
}

const RELIGIOSITY_FIT: Record<Religiosity, Record<AreaChar, number>> = {
  secular: { secular: 0.8, mixed: 0.2, religious: -0.3, haredi: -0.9 },
  traditional: { secular: 0.3, mixed: 0.5, religious: 0.3, haredi: -0.2 },
  religious: { secular: -0.3, mixed: 0.2, religious: 0.9, haredi: 0.3 },
  haredi: { secular: -0.9, mixed: -0.1, religious: 0.4, haredi: 1.0 },
}

function areaCharacter(neighborhood: string, city: string): AreaChar | null {
  const n = neighborhood.trim()
  if (n.length > 0 && n in AREA_BY_NAME) return AREA_BY_NAME[n]
  const c = city.trim()
  if (c.length > 0 && c in AREA_BY_NAME) return AREA_BY_NAME[c]
  for (const [name, char] of Object.entries(AREA_BY_NAME)) {
    if (n.includes(name) || c.includes(name)) return char
  }
  return null
}

// Port of search_chat_screen._religiosityBoost + _rankByLifestyle (0.18 factor).
export function rankByLifestyle(input: ScoredWebProperty[], rawText: string): ScoredWebProperty[] {
  const rel = detectReligiosity(rawText)
  if (rel === null) return input
  const boost = (p: Property): number => {
    const area = areaCharacter(p.neighborhood ?? '', p.city ?? '')
    if (area === null) return 0
    return RELIGIOSITY_FIT[rel][area]
  }
  return [...input]
    .map((r) => ({ r, s: r.score + 0.18 * boost(r.property) }))
    .sort((a, b) => b.s - a.s)
    .map((e) => e.r)
}

// ─────────────────────────────────────────────────────────────────────────────
// rankProperties — port of SmartSearch.rank (transaction gate → advanced when
// the query has essentials, simple scorer otherwise) + the fast path's
// lifestyle re-rank.
// ─────────────────────────────────────────────────────────────────────────────

export function rankProperties(
  q: ParsedQuery,
  properties: Property[],
  limit = 10,
): ScoredWebProperty[] {
  // Hard rent/sale gate first so neither ranking path can mix the two.
  const pool = applyTransactionFilter(properties, q)
  let ranked: ScoredWebProperty[]
  if (queryHasEssentials(q) && pool.length > 0) {
    ranked = rankAdvancedLegacy(pool, q, limit)
  } else {
    ranked = pool
      .map((p) => scoreSimple(p, q))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
  return rankByLifestyle(ranked, q.rawText)
}

// ─────────────────────────────────────────────────────────────────────────────
// buildReply — the fast-mode reply lines, verbatim from search_chat_screen.dart
// (_localAck / empty-results honesty / the results-header trio)
// ─────────────────────────────────────────────────────────────────────────────

export function buildReply(q: ParsedQuery, results: ScoredWebProperty[]): string {
  if (results.length === 0) {
    if (queryIsEmpty(q)) {
      return 'ספר/י לי מה מחפשים — עיר, תקציב, כמה חדרים, ומה חשוב לך 🙂'
    }
    const city = q.city?.trim() || 'האזור הזה'
    return (
      `לא מצאתי דירות שעונות לבקשה ב${city} עם הסינונים האלה 😕\n` +
      'אפשר להרחיב את האזור, להעלות תקציב או להוריד סינונים כדי למצוא אופציות מתאימות.'
    )
  }
  const anyExact = results.some((r) => r.exact)
  const exactCount = results.filter((r) => r.exact).length
  if (!anyExact) return 'אלה הכי קרובות למה שחיפשת 👇'
  if (exactCount === results.length) return `מצאתי ${exactCount} דירות שמתאימות לך 🎯`
  return `מצאתי ${exactCount} שמתאימות בול, והוספתי עוד קרובות כדי שיהיה ממה לבחור 👇`
}

// ─────────────────────────────────────────────────────────────────────────────
// describeQuery — port of SearchQuery.describe (the parsed-filters strip)
// ─────────────────────────────────────────────────────────────────────────────

function roomsRangeLabel(lo: number | null, hi: number | null): string {
  const f = (r: number): string => (r % 1 === 0 ? String(Math.trunc(r)) : String(r))
  if (lo !== null && hi !== null) return lo === hi ? f(lo) : `${f(lo)}-${f(hi)}`
  if (lo !== null) return `${f(lo)}+`
  return `עד ${f(hi!)}`
}

function priceRangeLabel(lo: number | null, hi: number | null): string {
  const m = (v: number): string => '₪' + v.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1,')
  if (lo !== null && hi !== null) return `${m(lo)}–${m(hi)}`
  if (hi !== null) return `עד ${m(hi)}`
  return `מ-${m(lo!)}`
}

export function describeQuery(q: ParsedQuery): string {
  const parts: string[] = []
  if (q.transactionType === 'sale') parts.push('🏷️ למכירה')
  else if (q.transactionType === 'rent') parts.push('🔑 להשכרה')
  if (q.neighborhood !== null) {
    parts.push(`📍 ${q.neighborhood}${q.city !== null ? ', ' + q.city : ''}`)
  } else if (q.city !== null) {
    parts.push(`📍 ${q.city}`)
  }
  if (q.propertyType !== null) parts.push(`🏠 ${q.propertyType}`)
  if (q.minRooms !== null || q.maxRooms !== null) {
    parts.push(`🛏️ ${roomsRangeLabel(q.minRooms, q.maxRooms)} חד׳`)
  }
  if (q.minPrice !== null || q.maxPrice !== null) {
    parts.push(`💰 ${priceRangeLabel(q.minPrice, q.maxPrice)}`)
  }
  if (q.nearTrain) parts.push('🚉 ליד הרכבת')
  if (q.cheapPreference) parts.push('🏷️ הכי משתלם')
  for (const a of q.amenities) parts.push(amenityTag(a))
  return parts.join('  ·  ')
}

// ─────────────────────────────────────────────────────────────────────────────
// cohortSignals — verbatim port of SmartSearch.cohortSignals (smart_search.dart
// :1520). Persona/cohort signals mined from the WHOLE conversation text and sent
// to the backend `resolveCohort` so the 14-cohort taxonomy + community_fit engage.
// Same keyword tables, same key names, same order of precedence. Do not "improve".
// ─────────────────────────────────────────────────────────────────────────────

export function cohortSignals(rawText: string): Record<string, string> {
  const t = rawText.toLowerCase()
  const has = (ws: string[]) => ws.some((w) => t.includes(w))
  const s: Record<string, string> = {}

  // "בלי / ללא / אין ילדים" negates children — otherwise the ילד* substring
  // (also inside ילדים) mis-tags a childless couple as a family with kids.
  const noKids = /(?:בלי|ללא|אין|בלא)\s*ילד/.test(t)

  // household (also gates charedi/dati_leumi split, which needs family context)
  if (has(['משפח', 'family']) || (!noKids && has(['ילדים', 'ילד ', 'הילד', 'children', 'kids']))) {
    s.household = 'family'
  } else if (has(['סטודנט', 'שותפים', 'student', 'roommate'])) {
    s.household = 'student'
  } else if (has(['זוג', 'couple', 'בן/בת זוג'])) {
    s.household = 'couple'
  } else if (has(['רווק', 'רווקה', 'לבד', 'single', 'solo'])) {
    s.household = 'single'
  }

  // religiosity → stream (charedi vs dati_leumi have OPPOSITE school needs).
  // NB: a CITY name (בני ברק) is NOT a religiosity signal.
  if (has(['חרדי', 'חרדית', 'חיידר', 'תלמוד תורה', 'haredi', 'charedi'])) {
    s.religiousStream = 'charedi'
    s.isReligious = 'true'
  } else if (has(['דתי לאומי', 'דתיה לאומית', 'סרוג', 'אולפנה', 'ישיבה תיכונית', 'dati leumi'])) {
    s.religiousStream = 'dati_leumi'
    s.isReligious = 'true'
  } else if (has(['דתי', 'דתיה', 'שומר שבת', 'בית כנסת', 'religious', 'synagogue', 'kosher'])) {
    s.isReligious = 'true'
  }

  // sector (Arabic listing pools / school proximity)
  if (has(['ערבי', 'ערבית', 'عرب', 'الناصرة', 'مدرسة'])) s.sector = 'arab'

  // oleh / language preference
  if (has(['עולה', 'עולה חדש', 'immigrant', 'oleh', 'olah', 'aliyah', 'new to israel'])) {
    s.isOleh = 'true'
  }
  if (has(['english speaker', 'english speaking', 'english-speaking', 'דובר אנגלית', 'אנגלית'])) {
    s.langPref = 'en'
  }
  if (has(['דובר צרפתית', 'french speaker', 'צרפתית'])) s.langPref = 'fr'

  // children / life-stage timing ("בלי ילדים" already negated via noKids)
  if (!noKids && has(['ילד', 'ילדים', 'kids', 'children'])) s.hasChildren = 'true'
  if (has(['בהריון', 'הריון', 'pregnant', 'expecting', 'תינוק בדרך'])) s.expecting = 'true'
  if (has(['תינוק', 'רך נולד', 'baby', 'newborn'])) {
    s.hasChildren = 'true'
    s.childAge = '1'
  }

  // mobility / work
  if (has(['בלי רכב', 'ללא רכב', 'אין לי רכב', 'אין רכב', 'no car', 'car-free', 'תחבורה ציבורית'])) {
    s.carFree = 'true'
  }
  if (has(['עובד מהבית', 'עבודה מהבית', 'מהבית', 'wfh', 'work from home', 'remote work', 'חדר עבודה'])) {
    s.wfh = 'true'
  }

  // accessibility → senior/accessible cohort
  if (
    has(['נגיש', 'נגישות', 'כיסא גלגלים', 'כסא גלגלים', 'נכה', 'wheelchair',
      'accessible', 'disabled', 'קושי בהליכה', 'מתקשה ללכת', 'הליכון', 'צולע'])
  ) {
    s.accessibilityNeed = 'true'
  }

  // life stage. "מבוגר/ת" is a very common elderly self-description.
  if (has(['סטודנט', 'סטודנטית', 'student'])) s.lifeStage = 'student'
  if (
    has(['גמלאי', 'פנסיונר', 'פנסיונרית', 'קשיש', 'מבוגר', 'מבוגרת',
      'בגיל השלישי', 'גיל הפרישה', 'retired', 'senior', 'pensioner', 'elderly'])
  ) {
    s.lifeStage = 'senior'
  }
  // explicit age ("בן 72" / "age 72"). Guard against a BUILDING's age.
  const ageM = /(?:בן|בת|גיל|age)\s*(\d{2,3})/.exec(t)
  if (ageM) {
    const start = ageM.index
    const before = t.slice(Math.max(0, start - 8), start)
    if (!/בניין|בית|מבנה|דירה|נכס/.test(before)) s.age = ageM[1]
  }

  // intent
  if (has(['משקיע', 'השקעה', 'תשואה', 'investor', 'investment', 'yield', 'לקנייה', 'לקנות', 'רכישה'])) {
    s.isInvestor = 'true'
    s.intent = 'investment'
  }

  // vibe (soft neighbourhood-vibrancy target the backend cohort reads)
  if (has(['תוסס', 'חיי לילה', 'nightlife', 'vibrant', 'לב העיר', 'במרכז'])) {
    s.vibe = 'תוסס'
  } else if (has(['שקט', 'quiet', 'רגוע', 'peaceful'])) {
    s.vibe = 'שקט'
  } else if (s.household === 'family') {
    s.vibe = 'משפחתי'
  } else if (s.lifeStage === 'student') {
    s.vibe = 'סטודנטיאלי'
  }
  return s
}
