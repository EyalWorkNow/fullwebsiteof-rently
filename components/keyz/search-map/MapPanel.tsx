'use client'

// Search-page map panel — price-pin markers, freehand lasso area filter, and a
// docked אתי chat that drives the grid through the same lasso channel.
//
// Leaflet is loaded with a dynamic import inside useEffect (never during
// SSR/prerender); only its CSS and types are imported statically — the same
// SSR-safe pattern as NearbyMap.tsx.

import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker, Polygon, Polyline, LatLng } from 'leaflet'
import { CloseCircle, Designtools, Eraser, Gps, MagicStar, Send2 } from 'iconsax-react'
import type { Property } from '@/lib/live/types'
import { addressLabel, priceLabel, primaryImage } from '@/lib/live/api'
import { buildReply, parseQuery, rankProperties } from '@/lib/live/smart-search'

type LeafletModule = typeof import('leaflet')

const PRIMARY = '#2563EB'

interface MapPanelProps {
  items: Property[] // filtered listings to show as pins
  visibleIds: Set<string> // ids currently visible in the grid (filters ∩ lasso)
  onLassoChange: (ids: Set<string> | null) => void // contained ids; null = cleared
}

// ── helpers ──────────────────────────────────────────────────────────────────

function trimNum(n: number): string {
  const s = n.toFixed(1)
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

/** Compact pin price: rent thousands → "₪7.2K", sale millions → "₪2.4M". */
function compactPrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return '₪—'
  if (price >= 1_000_000) return `₪${trimNum(price / 1_000_000)}M`
  if (price >= 1_000) return `₪${trimNum(price / 1_000)}K`
  return `₪${Math.round(price)}`
}

/** Ray-casting point-in-polygon (lon = x, lat = y). Vertices as [lat, lon]. */
function pointInPolygon(lat: number, lon: number, poly: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0]
    const xi = poly[i][1]
    const yj = poly[j][0]
    const xj = poly[j][1]
    if (!Number.isFinite(yi) || !Number.isFinite(xi) || !Number.isFinite(yj) || !Number.isFinite(xj)) continue
    const crosses =
      (yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

// Popup content built via DOM APIs (textContent) — listing fields are
// untrusted, never feed them through innerHTML.
function popupEl(p: Property): HTMLElement {
  const root = document.createElement('div')
  root.dir = 'rtl'
  root.style.cssText = 'font-family:inherit;text-align:right;width:196px'

  const src = primaryImage(p)
  if (src) {
    const img = document.createElement('img')
    img.src = src
    img.alt = ''
    img.loading = 'lazy'
    img.style.cssText =
      'display:block;width:100%;height:104px;object-fit:cover;border-radius:12px 12px 0 0;background:#F5F7FA'
    root.appendChild(img)
  } else {
    const ph = document.createElement('div')
    ph.textContent = '🏢'
    ph.style.cssText =
      'display:flex;align-items:center;justify-content:center;width:100%;height:104px;font-size:34px;border-radius:12px 12px 0 0;background:#F5F7FA'
    root.appendChild(ph)
  }

  const body = document.createElement('div')
  body.style.cssText = 'padding:10px 12px 12px'
  const addr = document.createElement('div')
  addr.textContent = addressLabel(p)
  addr.style.cssText = 'font-weight:800;color:#072946;font-size:13.5px'
  const cityLine = document.createElement('div')
  cityLine.textContent = p.city ?? ''
  cityLine.style.cssText = 'color:#5B7A99;font-size:11.5px;font-weight:700;margin-top:2px'
  const price = document.createElement('div')
  price.textContent = priceLabel(p)
  price.style.cssText = 'color:#2563EB;font-size:13px;font-weight:800;margin-top:4px'
  const link = document.createElement('a')
  link.href = `/listing/${encodeURIComponent(p.id)}`
  link.textContent = 'לצפייה בדירה'
  link.style.cssText =
    'display:block;margin-top:8px;text-align:center;background:#2563EB;color:#fff;font-weight:800;font-size:12.5px;border-radius:9999px;padding:7px 12px;text-decoration:none'
  body.append(addr, cityLine, price, link)
  root.appendChild(body)
  return root
}

// ── component ────────────────────────────────────────────────────────────────

export default function MapPanel({ items, visibleIds, onLassoChange }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const leafletRef = useRef<LeafletModule | null>(null)
  const markersRef = useRef<Map<string, Marker>>(new Map())
  const lassoRef = useRef<Polygon | null>(null)
  const didFitRef = useRef(false)
  const [ready, setReady] = useState(false)

  const [drawMode, setDrawMode] = useState(false)
  const [hasLasso, setHasLasso] = useState(false)

  const [chatOpen, setChatOpen] = useState(false)
  const [atiInput, setAtiInput] = useState('')
  const [atiReply, setAtiReply] = useState<string | null>(null)
  const chatInputRef = useRef<HTMLInputElement | null>(null)

  // Latest props for use inside Leaflet event handlers (avoid stale closures).
  const itemsRef = useRef(items)
  itemsRef.current = items
  const visibleIdsRef = useRef(visibleIds)
  visibleIdsRef.current = visibleIds
  const onLassoChangeRef = useRef(onLassoChange)
  onLassoChangeRef.current = onLassoChange

  // ── init / teardown (strict-mode safe: disposed guard + mapRef check) ─────
  useEffect(() => {
    let disposed = false
    ;(async () => {
      const mod = await import('leaflet')
      const L: LeafletModule = mod.default ?? mod
      if (disposed || !containerRef.current || mapRef.current) return
      const map = L.map(containerRef.current, {
        center: [32.08, 34.83], // greater Tel Aviv fallback until first fitBounds
        zoom: 11,
        scrollWheelZoom: true, // work surface — wheel zoom is expected here
        attributionControl: true,
      })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
      leafletRef.current = L
      setReady(true)
    })()
    return () => {
      disposed = true
      setReady(false)
      didFitRef.current = false
      markersRef.current.clear()
      lassoRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // ── price-pin markers (rebuilt when the filtered list changes) ────────────
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!ready || !L || !map) return
    for (const m of markersRef.current.values()) m.remove()
    markersRef.current.clear()

    const bounds = L.latLngBounds([])
    for (const p of items) {
      if (!p?.id || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue
      const dim = !visibleIdsRef.current.has(p.id)
      const marker = L.marker([p.lat, p.lon], {
        icon: L.divIcon({
          className: 'kz-price-pin-wrap' + (dim ? ' kz-pin-dim' : ''),
          // Safe for innerHTML: compactPrice emits only ₪ + digits + K/M.
          html: `<div class="kz-price-pin">${compactPrice(p.price)}</div>`,
          iconSize: [0, 0],
        }),
      }).bindPopup(popupEl(p), { closeButton: false, offset: [0, -12] })
      marker.addTo(map)
      markersRef.current.set(p.id, marker)
      bounds.extend([p.lat, p.lon])
    }
    // Fit only on FIRST data — re-fitting on every filter change is jarring;
    // the "מרכז מפה" control re-fits on demand.
    if (!didFitRef.current && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
      didFitRef.current = true
    }
  }, [ready, items])

  // ── dim pins that dropped out of the grid (filters ∩ lasso) ───────────────
  useEffect(() => {
    if (!ready) return
    for (const [id, marker] of markersRef.current) {
      marker.getElement()?.classList.toggle('kz-pin-dim', !visibleIds.has(id))
    }
  }, [ready, visibleIds, items])

  // ── lasso commit: polygon + ray-cast containment → onLassoChange ──────────
  const commitLasso = useCallback((pts: LatLng[]) => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map || pts.length < 3) return
    lassoRef.current?.remove() // redrawing replaces the previous polygon
    lassoRef.current = L.polygon(pts, {
      color: PRIMARY,
      weight: 2,
      fillColor: PRIMARY,
      fillOpacity: 0.08,
    }).addTo(map)
    const poly = pts.map((pt) => [pt.lat, pt.lng] as [number, number])
    const ids = new Set<string>()
    for (const p of itemsRef.current) {
      if (!p?.id || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue
      if (pointInPolygon(p.lat, p.lon, poly)) ids.add(p.id)
    }
    setHasLasso(true)
    onLassoChangeRef.current(ids)
  }, [])

  const clearLasso = useCallback(() => {
    lassoRef.current?.remove()
    lassoRef.current = null
    setHasLasso(false)
    onLassoChangeRef.current(null)
  }, [])

  // ── draw mode: pointer freehand → preview polyline → polygon ──────────────
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    const el = containerRef.current
    if (!ready || !L || !map || !el || !drawMode) return

    map.dragging.disable()
    map.closePopup()
    el.classList.add('kz-drawing')
    const prevTouchAction = el.style.touchAction
    el.style.touchAction = 'none' // let pointermove drive the draw on touch

    let drawing = false
    let pts: LatLng[] = []
    let lastPx: { x: number; y: number } | null = null
    let preview: Polyline | null = null

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      drawing = true
      pts = [map.mouseEventToLatLng(e)]
      lastPx = null
      preview?.remove()
      preview = L.polyline(pts, { color: PRIMARY, weight: 2, dashArray: '6 5' }).addTo(map)
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* capture is best-effort */
      }
      e.preventDefault()
    }
    const move = (e: PointerEvent) => {
      if (!drawing || !preview) return
      const px = map.mouseEventToContainerPoint(e)
      if (lastPx && Math.hypot(px.x - lastPx.x, px.y - lastPx.y) < 3) return
      lastPx = { x: px.x, y: px.y }
      pts.push(map.containerPointToLatLng(px))
      preview.setLatLngs(pts)
      e.preventDefault()
    }
    const up = () => {
      if (!drawing) return
      drawing = false
      preview?.remove()
      preview = null
      if (pts.length >= 3) commitLasso(pts)
      pts = []
      setDrawMode(false) // one lasso per activation; the button re-arms
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        drawing = false
        preview?.remove()
        preview = null
        pts = []
        setDrawMode(false)
      }
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      window.removeEventListener('keydown', onKey)
      preview?.remove()
      el.classList.remove('kz-drawing')
      el.style.touchAction = prevTouchAction
      if (mapRef.current) mapRef.current.dragging.enable()
    }
  }, [ready, drawMode, commitLasso])

  // ── controls ───────────────────────────────────────────────────────────────
  const recenter = useCallback(() => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return
    const bounds = L.latLngBounds([])
    for (const p of itemsRef.current) {
      if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) bounds.extend([p.lat, p.lon])
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }, [])

  // ── אתי: local smart-search over the current items → lasso channel ────────
  const submitAti = useCallback(() => {
    const text = atiInput.trim()
    if (!text) return
    const q = parseQuery(text)
    const ranked = rankProperties(q, itemsRef.current, 10)
    setAtiReply(buildReply(q, ranked))
    setAtiInput('')
    // A conversational subset supersedes any drawn area — same channel.
    lassoRef.current?.remove()
    lassoRef.current = null
    setHasLasso(false)
    const hits = ranked.filter(
      (r) => r.property?.id && Number.isFinite(r.property.lat) && Number.isFinite(r.property.lon),
    )
    if (ranked.length > 0) {
      onLassoChangeRef.current(new Set(ranked.map((r) => r.property.id)))
      const L = leafletRef.current
      const map = mapRef.current
      if (L && map && hits.length > 0) {
        const bounds = L.latLngBounds(hits.map((r) => [r.property.lat, r.property.lon] as [number, number]))
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
      }
    }
  }, [atiInput])

  const clearAtiReply = useCallback(() => {
    setAtiReply(null)
    onLassoChangeRef.current(null)
  }, [])

  useEffect(() => {
    if (chatOpen) chatInputRef.current?.focus()
  }, [chatOpen])

  return (
    <div className="relative z-0 h-full w-full overflow-hidden rounded-[28px] border border-border-app bg-white card-shadow">
      <style>{`
        .kz-price-pin-wrap { background: none; border: none; }
        .kz-price-pin {
          position: absolute; transform: translate(-50%, -50%);
          background: #fff; color: #072946; font-weight: 700; font-size: 12px;
          line-height: 1; padding: 6px 10px; border-radius: 9999px;
          border: 1px solid #E2ECF1; box-shadow: 0 8px 20px rgba(7, 41, 70, 0.12);
          white-space: nowrap; cursor: pointer; transition: opacity .15s ease;
          direction: ltr;
        }
        .kz-price-pin:hover { border-color: #2563EB; }
        .kz-pin-dim { opacity: .45; pointer-events: none; }
        .kz-search-map.kz-drawing { cursor: crosshair; }
        .kz-search-map.kz-drawing .leaflet-marker-pane,
        .kz-search-map.kz-drawing .leaflet-popup-pane { pointer-events: none; }
        .kz-search-map .leaflet-popup-content-wrapper {
          border-radius: 16px; overflow: hidden; padding: 0;
        }
        .kz-search-map .leaflet-popup-content { margin: 0; }
      `}</style>

      <div
        ref={containerRef}
        className="kz-search-map absolute inset-0 h-full w-full"
        role="application"
        aria-label="מפת תוצאות החיפוש"
      />

      {/* ── toolbar (top corner) ── */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setDrawMode((v) => !v)}
          aria-label={drawMode ? 'ביטול סימון אזור' : 'סימון אזור על המפה'}
          aria-pressed={drawMode}
          title="סימון אזור על המפה"
          className={`grid h-11 w-11 place-items-center rounded-full border card-shadow transition-colors ${
            drawMode
              ? 'border-primary bg-primary text-white'
              : 'border-border-app bg-white text-navy hover:border-primary'
          }`}
        >
          <Designtools size={20} color={drawMode ? '#fff' : '#072946'} variant={drawMode ? 'Bold' : 'Linear'} />
        </button>
        <button
          type="button"
          onClick={recenter}
          className="flex items-center gap-1.5 rounded-full border border-border-app bg-white px-3 py-2 text-[12px] font-bold text-navy card-shadow transition-colors hover:border-primary"
        >
          <Gps size={16} color={PRIMARY} variant="Linear" />
          מרכז מפה
        </button>
        {hasLasso && (
          <button
            type="button"
            onClick={clearLasso}
            className="flex items-center gap-1.5 rounded-full border border-border-app bg-white px-3 py-2 text-[12px] font-bold text-navy card-shadow transition-colors hover:border-primary"
          >
            <Eraser size={16} color={PRIMARY} variant="Linear" />
            נקה אזור
          </button>
        )}
      </div>

      {drawMode && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-navy/85 px-4 py-2 text-[12px] font-bold text-white">
          ציירו אזור על המפה · Esc לביטול
        </div>
      )}

      {/* ── אתי dock (map bottom) ── */}
      <div className="absolute inset-x-3 bottom-3 z-[1000] flex flex-col gap-2" dir="rtl">
        {atiReply && (
          <div className="relative rounded-2xl border border-border-app bg-white/95 px-4 py-3 pl-9 card-shadow backdrop-blur">
            <button
              type="button"
              onClick={clearAtiReply}
              aria-label="ניקוי תשובת אתי"
              className="absolute left-2 top-2 text-secondary-text transition-colors hover:text-navy"
            >
              <CloseCircle size={18} color="currentColor" variant="Bold" />
            </button>
            <div className="flex items-start gap-2">
              <MagicStar size={16} color={PRIMARY} variant="Bold" className="mt-0.5 shrink-0" />
              <p className="whitespace-pre-line text-[13px] font-semibold leading-relaxed text-navy">{atiReply}</p>
            </div>
          </div>
        )}

        {chatOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitAti()
            }}
            className="flex items-center gap-2 rounded-full border border-border-app bg-white/95 py-1.5 pl-1.5 pr-3 card-shadow backdrop-blur"
          >
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="סגירת הצ׳אט"
              className="shrink-0 text-secondary-text transition-colors hover:text-navy"
            >
              <CloseCircle size={20} color="currentColor" variant="Linear" />
            </button>
            <MagicStar size={18} color={PRIMARY} variant="Bold" className="shrink-0" />
            <input
              ref={chatInputRef}
              value={atiInput}
              onChange={(e) => setAtiInput(e.target.value)}
              placeholder="שאלי את אתי על האזור…"
              aria-label="שאלה לאתי על האזור"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-navy outline-none placeholder:text-secondary-text"
            />
            <button
              type="submit"
              disabled={!atiInput.trim()}
              aria-label="שליחה לאתי"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-white transition-opacity disabled:opacity-40"
            >
              <Send2 size={16} color="#fff" variant="Bold" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 self-center rounded-full border border-border-app bg-white/95 px-5 py-2.5 text-[13px] font-bold text-secondary-text card-shadow backdrop-blur transition-colors hover:border-primary hover:text-navy"
          >
            <MagicStar size={18} color={PRIMARY} variant="Bold" />
            שאלי את אתי על האזור…
          </button>
        )}
      </div>
    </div>
  )
}
