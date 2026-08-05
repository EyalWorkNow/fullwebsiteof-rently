# Rently Web V2 — תוכנית פעולה מקיפה

מטרה: להשלים את האתר לפלטפורמה מלאה — סינון זהה לאפליקציה, חיפוש דו־עמודתי עם מפה+לאסו+אתי,
ביצועים מהירים, דף אתי ייעודי, ניווט נוח, ופורטל בעל־דירה עם אריק ויומן — הכול מסונכרן לאפליקציה.

## חוזי אמת (מהרקון)
- **סינון**: `SearchFilters` @ flutter lib/data/models/rental_models.dart:1897 (+ UI הסינון של השוכר ב־discover_screen.dart). לפורט 1:1.
- **אריק**: `POST /assistant` מחזיר `{reply, propertyDraft, listings}` (router index.mjs:6388). פרסום = אותו נתיב DB שהאפליקציה משתמשת בו (property_repository.dart).
- **יומן**: אין endpoint ייעודי בשרת; האפליקציה לוקאלית. סנכרון web↔app דרך `/broker_data/<name>` (owner-scoped, חי בפרוד) במסמך `viewing_slots`.
- **אימות**: אותו פרויקט Firebase — Google popup ב웹 = אותו uid כמו באפליקציה → סנכרון אמיתי.

## Wave 0 — תשתית ביצועים (אני, לפני הסוכנים; קבצים משותפים)
1. `app/api/listings/route.ts` — קאש שרת לרשימות: טוקן אנונימי נטבע בשרת (REST identitytoolkit,
   קאש ~50 דק'), משיכת upstream אחת, TTL 60ש', תגובה מיידית. פותר את האיטיות (המתנת Firebase בדפדפן).
2. `app/api/nearby/route.ts` — פרוקסי Overpass עם קאש לפי גריד 3 ספרות (TTL 7 ימים, race מראות,
   s-maxage). פותר את האיטיות של "מה יש בסביבה" + חוסך throttling.
3. `lib/live/api.ts` + `lib/live/nearby.ts` — עוברים לנתיבים החדשים (עם fallback לישן).
4. `lib/live/firebase.ts` — הוספת signInWithGoogle/signOut/currentUser (פורט מ־map-web) לשימוש הפורטל.

## Wave 1 — חמישה סוכנים במקביל (בעלות קבצים נפרדת)
- **A — סרגל סינון + מבנה דו־עמודתי** (`app/real-estate/*`): פורט מלא של SearchFilters מהאפליקציה
  כ־sidebar (ערים, טווח מחיר, חדרים, גודל, קומה, כל תגי הסינון, מקומות בסביבה מועדפים, ריהוט/חיות/ממ"ד…),
  מבנה עמוד: עמודה ימנית = sidebar+גריד, עמודה שמאלית = מפה דביקה. חוזה MapPanel:
  `<MapPanel items={Property[]} visibleIds={Set<string>} onLassoChange={(ids: Set<string>|null)=>void} />`
  מ־`components/keyz/search-map/MapPanel`.
- **B — פאנל המפה** (`components/keyz/search-map/*` בלבד): Leaflet עם pin מחיר לכל דירה מסוננת,
  לאסו (ציור חופשי → point-in-polygon → onLassoChange), צ'אט אתי צף על המפה (מנוע smart-search המקומי)
  שמסנן/מדגיש pins, כפתור ניקוי לאסו. לפי החוזה של A.
- **C — דף אתי ייעודי** (`app/ati/*`): צ'אט מלא עם רשימת שיחות (localStorage: יצירה/החלפה/מחיקה/שם),
  מנוע מקומי מיידי + תשובת backend כשזמינה, כרטיסי דירות inline, קישור מה־TopBar.
- **D — ניווט ו־UX** (`ListingClient.tsx`, `BackToTop.tsx`, `TopBar.tsx`): כפתור חזרה צף בדף דירה
  (router.back עם fallback ל־/real-estate), BackToTop קבוע בצד שמאל למטה, קישור "אתי AI" → /ati.
- **E — פורטל בעל דירה** (`app/landlord/*`): כניסת Google, צ'אט אריק (POST /assistant, תצוגת propertyDraft
  ככרטיס עריכה, פרסום בנתיב של האפליקציה), קלט קולי Web Speech API (he-IL) + הקראת תשובות,
  טאב יומן (CRUD חלונות ביקור ב־/broker_data/viewing_slots), רשימת הנכסים שלי.

## Wave 2 — אינטגרציה (אני)
חיבור סופי, `tsc` + `npm run build`, בדיקות עשן על כל הדפים, commit.

## סיכונים
- לאסו בלי plugin: ציור ידני על overlay — מיושם ידנית, בלי תלות חדשה.
- קול: Web Speech API (Chrome/Safari) — fallback לצ'אט טקסט בדפדפנים בלי תמיכה.
- יומן: אם /broker_data דוחה uid לא־ברוקר — fallback ל־localStorage עם תווית "מקומי בלבד" (שקיפות).
