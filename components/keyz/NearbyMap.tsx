'use client'

// Real interactive map for מה יש בסביבה — plain Leaflet (no react-leaflet).
//
// OSM tiles centered on the property, POI circle-markers colored by the SAME
// shared 7-group palette as the radar (nearby-groups.tsx), RTL popups with
// name / kind / distance / walking minutes. Group visibility is controlled by
// the parent (NearbyPlaces) via `hidden`, so the legend chips drive the map
// and the radar identically.
//
// Leaflet itself is loaded with a dynamic import inside useEffect (never runs
// during SSR/prerender); only its CSS and types are imported statically —
// external-package stylesheets are importable from any component in the App
// Router (node_modules/next/dist/docs/01-app/01-getting-started/11-css.md).

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, LayerGroup } from 'leaflet'
import { distLabel, walkLabel } from '@/lib/live/nearby'
import { groupColor, type NearbyPoi } from './nearby-groups'

type LeafletModule = typeof import('leaflet')

// Popup content built via DOM APIs (textContent) — OSM names are untrusted,
// never feed them through innerHTML.
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

  // --- init / teardown (strict-mode safe: disposed guard + mapRef check) ---
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
        scrollWheelZoom: false, // don't hijack page scroll
        attributionControl: true,
      })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      // Property marker: pulsing brand dot (same look as the radar center).
      L.marker([lat, lon], {
        icon: L.divIcon({
          className: 'kz-map-center-wrap',
          html: '<div class="kz-map-center"><span class="kz-map-center-pulse"></span></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
        keyboard: false,
        interactive: false,
      }).addTo(map)
      mapRef.current = map
      leafletRef.current = L
      setReady(true)
    })()
    return () => {
      disposed = true
      setReady(false)
      groupLayersRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [lat, lon])

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
      const marker = L.circleMarker([d.lat, d.lon], {
        radius: 7,
        fillColor: groupColor(d.group),
        fillOpacity: 0.9,
        color: '#fff',
        weight: 2,
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
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 })
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
    <div className="overflow-hidden rounded-[28px] border border-border-app bg-white card-shadow">
      <style>{`
        .kz-map-center-wrap { background: none; border: none; }
        .kz-map-center {
          position: relative; width: 20px; height: 20px; border-radius: 9999px;
          background: #2563EB; border: 3px solid #fff;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
        }
        .kz-map-center-pulse {
          position: absolute; inset: -4px; border-radius: 9999px;
          background: rgba(37, 99, 235, 0.35);
          animation: kz-map-pulse 2.4s ease-out infinite;
        }
        @keyframes kz-map-pulse {
          0% { transform: scale(1); opacity: .6; }
          70% { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .kz-map-center-pulse { animation: none; opacity: 0; }
        }
        .kz-nearby-map .leaflet-popup-content { margin: 10px 14px; }
        .kz-nearby-map .leaflet-popup-content-wrapper { border-radius: 14px; }
      `}</style>
      <div
        ref={containerRef}
        // relative z-0 creates a stacking context so Leaflet's high-z panes
        // never float above the site's sticky chrome while scrolling.
        className="kz-nearby-map relative z-0 h-[420px] w-full"
        role="application"
        aria-label="מפה אינטראקטיבית של מקומות בסביבת הנכס"
      />
    </div>
  )
}
