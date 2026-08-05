# Rently Homepage — Page Topology (structure inspired by keyz.ai, all-Rently design)

Source of design truth: the Flutter app (`app_colors.dart`, `assistant_property_card.dart`),
NOT keyz.ai — only the section *ordering and layout concept* mirrors keyz.

Order (top → bottom), RTL, Hebrew:

1. **TopBar** — fixed glass app-bar. Logo right (RTL start), nav links center, CTA "הורדת האפליקציה" left. `components/keyz/TopBar.tsx`
2. **Hero** — warm greeting headline ("כיף שבאת, איזו דירה נחפש היום?"), big rounded AI search bar (אתי), suggestion chips under it. Soft primary-light2 → white gradient bg. `components/keyz/Hero.tsx`
3. **CategoryPicker** — 4 pill/tile choices: השכרה · מכירה · סיורי 360 · מתווכים. `components/keyz/CategoryPicker.tsx`
4. **ListingRows** — 2–3 horizontal carousels of PropertyCard (port of AssistantPropertyCard) fed by live API (`lib/live/api.ts`, sample fallback): "חדשות באזור שלך", "הכי נצפות", "עם סיור 360". `components/keyz/ListingRows.tsx` + `PropertyCard.tsx`
5. **AiBanner** — split banner for אתי (AI search assistant), phone-mock style, CTA. `components/keyz/AiBanner.tsx`
6. **AppDownloadBanner** — App Store / Google Play badges + QR feel. `components/keyz/AppDownloadBanner.tsx`
7. **Services** — 4 service cards: הדמיית AI, סיור 360, חוזה דיגיטלי + חתימה, ניתוח שכונה. `components/keyz/Services.tsx`
8. **SiteFooter** — logo, link columns, social, legal. `components/keyz/SiteFooter.tsx`

Interaction models: all static except (a) TopBar gains shadow+solid bg after 24px scroll,
(b) ListingRows horizontal scroll + live fetch on mount, (c) suggestion chips fill the search input.

Assembly: `app/page.tsx` imports all in order. Existing `ScrollProgress`/`BackToTop` stay.
