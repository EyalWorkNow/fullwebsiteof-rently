'use client'

// SVG "radar" map for מה יש בסביבה — zero dependencies.
//
// Property at the center (pulsing dot + house glyph), 3 concentric distance
// rings (250 מ׳ / 500 מ׳ / 1 ק״מ, sqrt radial scale so the inner area isn't
// cramped), POI dots positioned by TRUE bearing + distance (north = up),
// colored by the shared category-group palette (nearby-groups.tsx). Hover /
// tap a dot → floating tooltip.
//
// Group visibility (`hidden`) is lifted to NearbyPlaces so the legend chips —
// rendered there — drive both this radar and the Leaflet map in sync.
//
// All geometry is guarded: dots arrive pre-validated (finite km + bearing)
// and anything non-finite is dropped again here — this component never throws.

import { useMemo, useState } from 'react'
import { distLabel, walkLabel } from '@/lib/live/nearby'
import { groupColor, type NearbyPoi } from './nearby-groups'

const SIZE = 400 // viewBox is SIZE×SIZE, center at SIZE/2
const C = SIZE / 2
const R_MAX = 168 // outer ring radius (= 1 km)
const RING_KM = [0.25, 0.5, 1]
const RING_LABELS = ['250 מ׳', '500 מ׳', '1 ק״מ']

// sqrt radial scale: area between rings stays readable near the center.
function radiusFor(km: number): { r: number; clamped: boolean } {
  if (!Number.isFinite(km) || km <= 0) return { r: 0, clamped: false }
  if (km >= 1) return { r: R_MAX, clamped: km > 1 }
  return { r: R_MAX * Math.sqrt(km), clamped: false }
}

// Entrance stagger band by distance ring (inner dots appear first).
function delayFor(km: number, index: number): string {
  const band = km <= 0.25 ? 0 : km <= 0.5 ? 1 : km <= 1 ? 2 : 3
  return `${(0.08 + band * 0.14 + (index % 8) * 0.02).toFixed(2)}s`
}

interface Positioned extends NearbyPoi {
  x: number
  y: number
  clamped: boolean
  delay: string
}

export default function NearbyRadar({
  dots,
  hidden,
}: {
  dots: NearbyPoi[]
  hidden: ReadonlySet<string>
}) {
  const [active, setActive] = useState<string | null>(null)

  const positioned = useMemo<Positioned[]>(() => {
    const out: Positioned[] = []
    dots.forEach((d, i) => {
      if (!Number.isFinite(d.km) || !Number.isFinite(d.bearing)) return
      const { r, clamped } = radiusFor(d.km)
      const th = (d.bearing * Math.PI) / 180
      const x = C + r * Math.sin(th)
      const y = C - r * Math.cos(th)
      if (!Number.isFinite(x) || !Number.isFinite(y)) return
      out.push({ ...d, x, y, clamped, delay: delayFor(d.km, i) })
    })
    return out
  }, [dots])

  const visible = useMemo(
    () => positioned.filter((d) => !hidden.has(d.group)),
    [positioned, hidden],
  )

  const activeDot = active != null ? visible.find((d) => d.id === active) ?? null : null

  return (
    <div dir="rtl" className="rounded-[28px] border border-border-app bg-white p-4 card-shadow sm:p-5">
      <style>{`
        @keyframes kz-dot-in { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        @keyframes kz-pulse { 0% { transform: scale(1); opacity: .45; } 70% { transform: scale(2.6); opacity: 0; } 100% { transform: scale(2.6); opacity: 0; } }
        .kz-dot { transform-box: fill-box; transform-origin: center; animation: kz-dot-in .4s ease-out both; }
        .kz-pulse { transform-box: fill-box; transform-origin: center; animation: kz-pulse 2.4s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .kz-dot { animation: none; }
          .kz-pulse { animation: none; opacity: 0; }
        }
      `}</style>

      <div className="relative mx-auto w-full max-w-[420px]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-auto w-full"
          role="img"
          aria-label="מפת מכ״ם של מקומות בסביבת הנכס לפי מרחק וכיוון"
        >
          {/* click on empty space closes the tooltip */}
          <rect x="0" y="0" width={SIZE} height={SIZE} fill="transparent" onClick={() => setActive(null)} />

          {/* distance rings + labels */}
          {RING_KM.map((km, i) => {
            const r = radiusFor(km).r
            return (
              <g key={km} pointerEvents="none">
                <circle cx={C} cy={C} r={r} fill="none" stroke="rgba(7,41,70,0.10)" strokeWidth={1.2} />
                <text
                  x={C}
                  y={C - r - 5}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#5B7A99"
                  stroke="#fff"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {RING_LABELS[i]}
                </text>
              </g>
            )
          })}

          {/* POI dots */}
          {visible.map((d) => (
            <g key={d.id} opacity={d.clamped ? 0.45 : 1}>
              <circle
                cx={d.x}
                cy={d.y}
                r={5}
                fill={groupColor(d.group)}
                stroke="#fff"
                strokeWidth={1.5}
                className="kz-dot"
                style={{ animationDelay: d.delay }}
                pointerEvents="none"
              />
              {/* generous invisible hit area for touch */}
              <circle
                cx={d.x}
                cy={d.y}
                r={12}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setActive(d.id)}
                onMouseLeave={() => setActive((cur) => (cur === d.id ? null : cur))}
                onClick={(e) => {
                  e.stopPropagation()
                  setActive((cur) => (cur === d.id ? null : d.id))
                }}
              />
            </g>
          ))}

          {/* property at the center: pulse + primary dot + house glyph */}
          <g pointerEvents="none">
            <circle cx={C} cy={C} r={10} fill="#2563EB" opacity={0.45} className="kz-pulse" />
            <circle cx={C} cy={C} r={10} fill="#2563EB" stroke="#fff" strokeWidth={2} />
            <path d={`M${C} ${C - 4.5}l5 4v5h-3.4v-3.2h-3.2v3.2H${C - 5}v-5z`} fill="#fff" />
          </g>
        </svg>

        {/* floating tooltip */}
        {activeDot && (
          <div
            dir="rtl"
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-xl border border-border-app bg-white px-3 py-1.5 card-shadow"
            style={{
              left: `${Math.min(82, Math.max(18, (activeDot.x / SIZE) * 100))}%`,
              top: `${(activeDot.y / SIZE) * 100}%`,
              transform: activeDot.y < 70 ? 'translate(-50%, 14px)' : 'translate(-50%, -125%)',
            }}
          >
            <div className="text-[12.5px] font-extrabold text-navy">
              {activeDot.name || 'ללא שם'}
            </div>
            <div className="text-[11.5px] font-bold text-secondary-text">
              {distLabel(activeDot.km)}
              {(() => {
                const w = walkLabel(activeDot.km)
                return w ? ` · ${w}` : ''
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
