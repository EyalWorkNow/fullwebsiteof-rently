'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, LayerGroup } from 'leaflet'
import { distLabel, walkLabel } from '@/lib/live/nearby'
import { groupColor, groupSvgPath, type NearbyPoi } from './nearby-groups'

type LeafletModule = typeof import('leaflet')

function popupEl(d: NearbyPoi): HTMLElement {
  const root = document.createElement('div')
  root.dir = 'rtl'
  root.style.cssText = 'font-family:inherit;text-align:right;min-width:120px'
  const name = document.createElement('div')
  name.textContent = d.name || 'ללא שם'
  name.style.cssText = 'font-weight:800;color:#072946;font-size:13.5px'
  const kind = document.createElement('div')
  kind.textContent = d.kindLabel
  kind.style.cssText = 'color:#5B7A99;font-size:11.5px;font-weight:700;margin-top:2px'
  const dist = document.createElement('div')
  const w = walkLabel(d.km)
  dist.textContent = w ? `${distLabel(d.km)} · ${w}` : distLabel(d.km)
  dist.style.cssText = 'color:#2563EB;font-size:12px;font-weight:800;margin-top:2px'
  root.append(name, kind, dist)
  return root
}

function markerHtml(group: string, color: string): string {
  const svgPath = groupSvgPath(group)
  return `
    <div class="kz-poi-pin" style="background-color:${color};">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        ${svgPath}
      </svg>
    </div>
  `
}

// Ultra-prominent, accessible Property Location Pin marker HTML
const PROPERTY_PIN_HTML = `
  <div class="kz-property-pin-wrapper">
    <div class="kz-property-pulse-1"></div>
    <div class="kz-property-pulse-2"></div>
    <div class="kz-property-badge">📍 הדירה</div>
    <div class="kz-property-pin-body">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    </div>
    <div class="kz-property-pin-arrow"></div>
  </div>
`

export default function NearbyMap({
  lat,
  lon,
  dots,
  hidden,
}: {
  lat: number
  lon: number
  dots: NearbyPoi[]
  hidden: ReadonlySet<string>
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const leafletRef = useRef<LeafletModule | null>(null)
  const groupLayersRef = useRef<Map<string, LayerGroup>>(new Map())
  const hiddenRef = useRef(hidden)
  hiddenRef.current = hidden
  const [ready, setReady] = useState(false)

  // --- init / teardown ---
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return
    let disposed = false
    ;(async () => {
      const mod = await import('leaflet')
      const L: LeafletModule = mod.default ?? mod
      if (disposed || !containerRef.current || mapRef.current) return
      const map = L.map(containerRef.current, {
        center: [lat, lon],
        zoom: 15,
        scrollWheelZoom: false,
        attributionControl: true,
      })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Prominent Property Pin marker (always stays on top with zIndexOffset: 10000)
      L.marker([lat, lon], {
        zIndexOffset: 10000,
        icon: L.divIcon({
          className: 'kz-property-marker-layer',
          html: PROPERTY_PIN_HTML,
          iconSize: [60, 60],
          iconAnchor: [30, 56],
        }),
        keyboard: false,
        interactive: false,
      }).addTo(map)

      mapRef.current = map
      leafletRef.current = L
      setReady(true)

      // Ensure tile sizes invalidate correctly after mounting inside wrapper
      setTimeout(() => {
        map.invalidateSize()
      }, 100)
    })()

    return () => {
      disposed = true
      setReady(false)
      groupLayersRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [lat, lon])

  // --- Invalidate map size when ready state updates ---
  useEffect(() => {
    if (ready && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [ready])

  // --- (re)build POI layer groups when the data changes ---
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!ready || !L || !map) return
    for (const g of groupLayersRef.current.values()) g.remove()
    groupLayersRef.current.clear()

    const layers = new Map<string, LayerGroup>()
    const bounds = L.latLngBounds([[lat, lon]])

    for (const d of dots) {
      if (!Number.isFinite(d.lat) || !Number.isFinite(d.lon)) continue
      const color = groupColor(d.group)
      const html = markerHtml(d.group, color)

      const marker = L.marker([d.lat, d.lon], {
        icon: L.divIcon({
          className: 'kz-poi-marker-wrap',
          html,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).bindPopup(popupEl(d), { closeButton: false })

      let g = layers.get(d.group)
      if (!g) {
        g = L.layerGroup()
        layers.set(d.group, g)
      }
      g.addLayer(marker)
      bounds.extend([d.lat, d.lon])
    }

    groupLayersRef.current = layers
    for (const [key, g] of layers) {
      if (!hiddenRef.current.has(key)) g.addTo(map)
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 })
      map.invalidateSize()
    }
  }, [ready, dots, lat, lon])

  // --- toggle group layers when the shared legend state changes ---
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    for (const [key, g] of groupLayersRef.current) {
      if (hidden.has(key)) {
        if (map.hasLayer(g)) map.removeLayer(g)
      } else if (!map.hasLayer(g)) {
        g.addTo(map)
      }
    }
  }, [ready, hidden])

  return (
    /* Outer container: 8px vertical gradient stroke border (white to light gray) + prominent drop shadow */
    <div className="relative p-[8px] rounded-[36px] bg-gradient-to-b from-white via-slate-200 to-slate-300 shadow-[0_20px_50px_rgba(7,41,70,0.18)]">
      <div className="overflow-hidden rounded-[28px] bg-white relative z-0 h-[420px] w-full">
        <style>{`
          .kz-property-marker-layer {
            background: none !important;
            border: none !important;
            z-index: 10000 !important;
          }
          .kz-property-pin-wrapper {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          }
          .kz-property-badge {
            background: #072946;
            color: #ffffff;
            font-weight: 900;
            font-size: 11px;
            padding: 3px 9px;
            border-radius: 12px;
            box-shadow: 0 4px 14px rgba(7, 41, 70, 0.35);
            border: 1.5px solid #ffffff;
            white-space: nowrap;
            margin-bottom: 3px;
            letter-spacing: 0.3px;
          }
          .kz-property-pin-body {
            width: 38px;
            height: 38px;
            border-radius: 9999px;
            background: linear-gradient(135deg, #0061FF 0%, #38B6FF 100%);
            border: 3px solid #ffffff;
            box-shadow: 0 8px 24px rgba(0, 97, 255, 0.48);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }
          .kz-property-pin-arrow {
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid #ffffff;
            margin-top: -2px;
            z-index: 1;
          }
          .kz-property-pulse-1 {
            position: absolute;
            bottom: 4px;
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            background: rgba(0, 97, 255, 0.45);
            animation: kz-prop-pulse 2s ease-out infinite;
            z-index: 0;
          }
          .kz-property-pulse-2 {
            position: absolute;
            bottom: 4px;
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            background: rgba(56, 182, 255, 0.45);
            animation: kz-prop-pulse 2s ease-out 0.8s infinite;
            z-index: 0;
          }
          @keyframes kz-prop-pulse {
            0% { transform: scale(1); opacity: 0.85; }
            100% { transform: scale(3.5); opacity: 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            .kz-property-pulse-1, .kz-property-pulse-2 { animation: none; opacity: 0; }
          }
          .kz-poi-marker-wrap { background: none; border: none; }
          .kz-poi-pin {
            width: 24px; height: 24px; border-radius: 9999px;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(7, 41, 70, 0.28);
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.15s ease-out;
            cursor: pointer;
          }
          .kz-poi-pin:hover {
            transform: scale(1.22);
            z-index: 1000;
          }
          .kz-nearby-map .leaflet-popup-content { margin: 10px 14px; }
          .kz-nearby-map .leaflet-popup-content-wrapper { border-radius: 14px; }
        `}</style>
        <div
          ref={containerRef}
          className="kz-nearby-map relative z-0 h-full w-full min-h-[420px]"
          role="application"
          aria-label="מפה אינטראקטיבית של מקומות בסביבת הנכס"
        />
      </div>
    </div>
  )
}
