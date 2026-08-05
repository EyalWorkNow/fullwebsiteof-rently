# PropertyCard Specification — web port of AssistantPropertyCard

Source: `flutter-ranting-tinder-project/lib/presentation/widgets/assistant_property_card.dart`
Target: `components/keyz/PropertyCard.tsx` (client component)
Interaction model: static + hover lift; heart toggles local saved state.

## Container
- width: 340px fixed (carousel item), flex-shrink-0
- background: #FFFFFF; border-radius: 28px; border: 1px solid #E2ECF1
- box-shadow: 0 8px 20px rgba(7,41,70,0.05)  (navy 5%)
- overflow: hidden; cursor: pointer
- hover: translateY(-4px) + shadow deepens to rgba(7,41,70,0.10), transition 200ms ease
- active/press: scale(0.97) (ScaleBounce equivalent)

## Media block
- wrapper padding: 5px (all sides); aspect-ratio: 1.84
- inner border-radius: 24px; overflow hidden; img object-fit: cover, full size
- fallback (no image): background #EFF6FF, centered building icon (iconsax-react Building) 48px color #2563EB

### Overlays on media (physical positions, matching the Flutter Positioned values)
- **Type badge** top:10px right:10px — white pill, padding 6px 10px, radius 20px,
  shadow 0 2px 4px rgba(0,0,0,0.12); text: propertyType (e.g. "דירה"), 12px, weight 800, color #072946
- **Verified badge** (only if verified) top:10px left:10px — white pill, padding 5px 8px, radius 20px,
  same shadow; green ✓ icon 13px #27AE60 + "מאומת" 11px weight 800 #072946, gap 3px
- **Actions** bottom:10px left:10px, row gap 8px — two white circles 34px,
  shadow 0 2px 4px rgba(0,0,0,0.12); icons 17px:
  heart (saved ? filled #FF5A67 : outline #072946), share (outline #072946)

## Body — padding: 8px 12px 16px
- Row (space-between, gap 12px):
  - Address: street + number (or neighborhood/city), 17px weight 900 #072946, 1 line ellipsis
  - under it (4px): city, neighborhood — 12px weight 600 #5B7A99, 1 line ellipsis
  - Price (end): "₪7,200/חודש", 18px weight 900 #072946, nowrap
- 10px gap, then **info chips row** (horizontal, overflow hidden):
  chip = bg #F1F5F9, radius 12px, padding 8px 12px, 12px weight 700 #072946,
  optional icon 14px #072946, gap 6px inside, 8px between chips.
  Chips: "X חדרים" (Home icon), "X מ״ר" (Maximize icon), then smartTags (no icon)
- **Geo tags** (if any tag starts with 🏫🌳🚉🏖️🎓🍸): wrap, 8px gaps, 10px top margin.
  tag = bg rgba(37,99,235,0.08), border 1px rgba(37,99,235,0.18), radius 10px,
  padding 6px 10px; icon 15px #2563EB + label 12.5px weight 600 #072946
  (strip the emoji, map to icon: 🏫 Buildings, 🌳 Tree, 🚉 Bus, 🏖️ Sun, 🎓 Teacher, 🍸 Coffee)

## Props
`{ property: Property; onSelect?: () => void }` — helpers from `lib/live/api.ts`
(priceLabel, primaryImage, addressLabel, cityLabel). Icons: `iconsax-react`.
