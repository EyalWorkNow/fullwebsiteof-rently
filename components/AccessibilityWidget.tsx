'use client'

import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Add,
  CloseCircle,
  Convertshape,
  DirectNotification,
  DocumentText,
  Eye,
  EyeSlash,
  Flash,
  InfoCircle,
  MagicStar,
  Maximize1,
  Maximize4,
  Minus,
  Moon,
  Refresh2,
  Sun1,
  Text,
  TextalignRight,
  TickCircle,
} from 'iconsax-react'

// ── USER COMPONENT: Custom Gooey Fluid SVG Toggle Switch ──────────────────────
interface SwitchProps {
  checked: boolean
  onChange: (val: boolean) => void
  id: string
}

const CustomSwitch: React.FC<SwitchProps> = ({ checked, onChange, id }) => {
  const filterId = `goo-${id}`
  return (
    <StyledSwitchWrapper>
      <div className="toggle-container">
        <input
          type="checkbox"
          className="toggle-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 292 142" className="toggle">
          <path
            d="M71 142C31.7878 142 0 110.212 0 71C0 31.7878 31.7878 0 71 0C110.212 0 119 30 146 30C173 30 182 0 221 0C260 0 292 31.7878 292 71C292 110.212 260.212 142 221 142C181.788 142 173 112 146 112C119 112 110.212 142 71 142Z"
            className="toggle-background"
          />
          <rect rx={6} height={64} width={12} y={39} x={64} className="toggle-icon on" />
          <path
            d="M221 91C232.046 91 241 82.0457 241 71C241 59.9543 232.046 51 221 51C209.954 51 201 59.9543 201 71C201 82.0457 209.954 91 221 91ZM221 103C238.673 103 253 88.6731 253 71C253 53.3269 238.673 39 221 39C203.327 39 189 53.3269 189 71C189 88.6731 203.327 103 221 103Z"
            fillRule="evenodd"
            className="toggle-icon off"
          />
          <g filter={`url('#${filterId}')`}>
            <rect fill="#fff" rx={29} height={58} width={116} y={42} x={13} className="toggle-circle-center" />
            <rect fill="#fff" rx={58} height={114} width={114} y={14} x={14} className="toggle-circle left" />
            <rect fill="#fff" rx={58} height={114} width={114} y={14} x={164} className="toggle-circle right" />
          </g>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation={10} result="blur" in="SourceGraphic" />
            <feColorMatrix result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" mode="matrix" in="blur" />
          </filter>
        </svg>
      </div>
    </StyledSwitchWrapper>
  )
}

const StyledSwitchWrapper = styled.div`
  .toggle-container {
    --active-color: #0061FF;
    --inactive-color: #CBD5E1;
    position: relative;
    aspect-ratio: 292 / 142;
    height: 1.6em;
    flex-shrink: 0;
  }

  .toggle-input {
    appearance: none;
    margin: 0;
    position: absolute;
    z-index: 1;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }

  .toggle {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .toggle-background {
    fill: var(--inactive-color);
    transition: fill 0.4s;
  }

  .toggle-input:checked + .toggle .toggle-background {
    fill: var(--active-color);
  }

  .toggle-circle-center {
    transform-origin: center;
    transition: transform 0.6s;
  }

  .toggle-input:checked + .toggle .toggle-circle-center {
    transform: translateX(150px);
  }

  .toggle-circle {
    transform-origin: center;
    transition: transform 0.45s;
    backface-visibility: hidden;
  }

  .toggle-circle.left {
    transform: scale(1);
  }

  .toggle-input:checked + .toggle .toggle-circle.left {
    transform: scale(0);
  }

  .toggle-circle.right {
    transform: scale(0);
  }

  .toggle-input:checked + .toggle .toggle-circle.right {
    transform: scale(1);
  }

  .toggle-icon {
    transition: fill 0.4s;
  }

  .toggle-icon.on {
    fill: var(--inactive-color);
  }

  .toggle-input:checked + .toggle .toggle-icon.on {
    fill: #fff;
  }

  .toggle-icon.off {
    fill: #eaeaec;
  }

  .toggle-input:checked + .toggle .toggle-icon.off {
    fill: var(--active-color);
  }
`

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'display' | 'colors' | 'tools'>('display')

  // Accessibility State Options
  const [fontSize, setFontSize] = useState(100) // 90, 100, 110, 120, 130
  const [letterSpacing, setLetterSpacing] = useState(false)
  const [lineHeight, setLineHeight] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const [readableFont, setReadableFont] = useState(false)

  const [highContrast, setHighContrast] = useState(false)
  const [grayscale, setGrayscale] = useState(false)
  const [invertColors, setInvertColors] = useState(false)
  const [darkContrast, setDarkContrast] = useState(false)
  const [highlightLinks, setHighlightLinks] = useState(false)
  const [highlightHeadings, setHighlightHeadings] = useState(false)

  const [largeCursor, setLargeCursor] = useState(false)
  const [readingLine, setReadingLine] = useState(false)
  const [readingMask, setReadingMask] = useState(false)
  const [focusBox, setFocusBox] = useState(false)
  const [stopAnimations, setStopAnimations] = useState(false)

  const [mouseY, setMouseY] = useState(200)
  const panelRef = useRef<HTMLDivElement>(null)

  // Track Mouse Y for Reading Line & Reading Mask
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      setMouseY(e.clientY)
    }
    if (readingLine || readingMask) {
      window.addEventListener('mousemove', handleMouseMove)
    }
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [readingLine, readingMask])

  // Sync accessibility states with documentElement classes
  useEffect(() => {
    const root = document.documentElement

    // Font scaling
    root.style.fontSize = fontSize === 100 ? '' : `${fontSize}%`

    // Toggles
    root.classList.toggle('acc-letter-spacing', letterSpacing)
    root.classList.toggle('acc-line-height', lineHeight)
    root.classList.toggle('acc-align-right', alignRight)
    root.classList.toggle('acc-readable-font', readableFont)

    root.classList.toggle('acc-contrast', highContrast)
    root.classList.toggle('acc-grayscale', grayscale)
    root.classList.toggle('acc-invert', invertColors)
    root.classList.toggle('acc-dark-contrast', darkContrast)
    root.classList.toggle('acc-highlight-links', highlightLinks)
    root.classList.toggle('acc-highlight-headings', highlightHeadings)

    root.classList.toggle('acc-large-cursor', largeCursor)
    root.classList.toggle('acc-focus-box', focusBox)
    root.classList.toggle('acc-stop-animations', stopAnimations)
  }, [
    fontSize,
    letterSpacing,
    lineHeight,
    alignRight,
    readableFont,
    highContrast,
    grayscale,
    invertColors,
    darkContrast,
    highlightLinks,
    highlightHeadings,
    largeCursor,
    focusBox,
    stopAnimations,
  ])

  // Count active settings
  const activeCount =
    (fontSize !== 100 ? 1 : 0) +
    (letterSpacing ? 1 : 0) +
    (lineHeight ? 1 : 0) +
    (alignRight ? 1 : 0) +
    (readableFont ? 1 : 0) +
    (highContrast ? 1 : 0) +
    (grayscale ? 1 : 0) +
    (invertColors ? 1 : 0) +
    (darkContrast ? 1 : 0) +
    (highlightLinks ? 1 : 0) +
    (highlightHeadings ? 1 : 0) +
    (largeCursor ? 1 : 0) +
    (readingLine ? 1 : 0) +
    (readingMask ? 1 : 0) +
    (focusBox ? 1 : 0) +
    (stopAnimations ? 1 : 0)

  const resetAll = () => {
    setFontSize(100)
    setLetterSpacing(false)
    setLineHeight(false)
    setAlignRight(false)
    setReadableFont(false)
    setHighContrast(false)
    setGrayscale(false)
    setInvertColors(false)
    setDarkContrast(false)
    setHighlightLinks(false)
    setHighlightHeadings(false)
    setLargeCursor(false)
    setReadingLine(false)
    setReadingMask(false)
    setFocusBox(false)
    setStopAnimations(false)
  }

  // Click outside to close panel
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <>
      {/* Global CSS Rules for Accessibility Modes */}
      <style jsx global>{`
        html.acc-contrast {
          filter: contrast(140%) !important;
        }
        html.acc-grayscale {
          filter: grayscale(100%) !important;
        }
        html.acc-invert {
          filter: invert(90%) hue-rotate(180deg) !important;
        }
        html.acc-dark-contrast body {
          background-color: #070d18 !important;
          color: #ffffff !important;
        }
        html.acc-letter-spacing * {
          letter-spacing: 0.12em !important;
        }
        html.acc-line-height * {
          line-height: 1.95 !important;
        }
        html.acc-align-right * {
          text-align: right !important;
        }
        html.acc-readable-font * {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        html.acc-highlight-links a {
          text-decoration: underline !important;
          text-decoration-thickness: 2.5px !important;
          text-underline-offset: 3.5px !important;
          color: #0061FF !important;
          background-color: rgba(0, 97, 255, 0.08) !important;
        }
        html.acc-highlight-headings h1,
        html.acc-highlight-headings h2,
        html.acc-highlight-headings h3,
        html.acc-highlight-headings h4,
        html.acc-highlight-headings h5,
        html.acc-highlight-headings h6 {
          border-right: 4px solid #0061FF !important;
          padding-right: 8px !important;
          text-decoration: underline !important;
        }
        html.acc-large-cursor,
        html.acc-large-cursor * {
          cursor: crosshair !important;
        }
        html.acc-focus-box *:focus,
        html.acc-focus-box *:focus-visible {
          outline: 4px solid #0061FF !important;
          outline-offset: 3px !important;
        }
        html.acc-stop-animations *,
        html.acc-stop-animations *::before,
        html.acc-stop-animations *::after {
          animation: none !important;
          transition: none !important;
        }
      `}</style>

      {/* Reading Line Overlay */}
      {readingLine && (
        <div
          className="pointer-events-none fixed left-0 right-0 h-2 bg-[#0061FF] shadow-[0_0_15px_#0061FF] z-[99999]"
          style={{ top: mouseY - 4 }}
        />
      )}

      {/* Reading Mask Overlay */}
      {readingMask && (
        <>
          <div
            className="pointer-events-none fixed top-0 left-0 right-0 bg-slate-950/70 z-[99998]"
            style={{ height: Math.max(0, mouseY - 45) }}
          />
          <div
            className="pointer-events-none fixed bottom-0 left-0 right-0 bg-slate-950/70 z-[99998]"
            style={{ top: mouseY + 45 }}
          />
        </>
      )}

      {/* Floating Accessibility Trigger Button (Bottom-Right) */}
      <div className="fixed bottom-5 right-5 z-50">
        <motion.button
          type="button"
          aria-label="תפריט נגישות"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.94 }}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#0061FF] to-[#38B6FF] text-white shadow-[0_8px_25px_rgba(0,97,255,0.38)] transition cursor-pointer"
        >
          {/* Custom Rently Accessibility Human Icon */}
          <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
            <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
          </svg>

          {/* Active Settings Count Badge */}
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white shadow-md animate-pulse">
              {activeCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Accessibility Panel Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-3 sm:p-6 pointer-events-none">
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="pointer-events-auto w-full max-w-[400px] rounded-3xl border border-slate-200/80 bg-white/95 p-4 sm:p-5 shadow-[0_20px_60px_rgba(7,41,70,0.22)] backdrop-blur-2xl text-slate-800 dir-rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0061FF]">
                    <MagicStar size={20} variant="Bold" color="#0061FF" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-black text-slate-900">הנגשת האתר Rently</h3>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-[#0061FF]">
                        תקן 5568 AA
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500">מרכז התאמות נגישות מתקדם</p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="סגור"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition"
                >
                  <CloseCircle size={22} color="currentColor" />
                </button>
              </div>

              {/* Navigation Category Tabs */}
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100/80 p-1 text-[12px] font-extrabold">
                <button
                  type="button"
                  onClick={() => setActiveTab('display')}
                  className={`py-1.5 rounded-xl transition ${
                    activeTab === 'display'
                      ? 'bg-white text-[#0061FF] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  טקסט ותצוגה
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('colors')}
                  className={`py-1.5 rounded-xl transition ${
                    activeTab === 'colors'
                      ? 'bg-white text-[#0061FF] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  צבעים וסגנון
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tools')}
                  className={`py-1.5 rounded-xl transition ${
                    activeTab === 'tools'
                      ? 'bg-white text-[#0061FF] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  עזרי מיקוד
                </button>
              </div>

              {/* Options Body */}
              <div className="mt-3.5 space-y-3 max-h-[54vh] overflow-y-auto no-scrollbar pe-1">
                {/* ── TAB 1: Display & Text ── */}
                {activeTab === 'display' && (
                  <>
                    {/* Font Scaler */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Text size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">גודל גופן</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">{fontSize}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200/80 shadow-sm">
                        <button
                          type="button"
                          disabled={fontSize <= 90}
                          onClick={() => setFontSize((s) => Math.max(90, s - 10))}
                          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 font-bold"
                        >
                          <Minus size={14} color="currentColor" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontSize(100)}
                          className="px-2 text-[11px] font-bold text-slate-600 hover:text-[#0061FF]"
                        >
                          100%
                        </button>
                        <button
                          type="button"
                          disabled={fontSize >= 140}
                          onClick={() => setFontSize((s) => Math.min(140, s + 10))}
                          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 font-bold"
                        >
                          <Add size={14} color="currentColor" />
                        </button>
                      </div>
                    </div>

                    {/* Letter Spacing */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Maximize4 size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">מרווח בין אותיות</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">הגדלת מרווח האותיות בטקסט</span>
                        </div>
                      </div>
                      <CustomSwitch checked={letterSpacing} onChange={setLetterSpacing} id="spacing" />
                    </div>

                    {/* Line Height */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <DocumentText size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">מרווח בין שורות</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">הגדלת גובה השורות לקריאה נוחה</span>
                        </div>
                      </div>
                      <CustomSwitch checked={lineHeight} onChange={setLineHeight} id="lh" />
                    </div>

                    {/* Text Align Right */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <TextalignRight size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">יישור טקסט לימין</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">יישור ימני מוחלט לכל התכנים</span>
                        </div>
                      </div>
                      <CustomSwitch checked={alignRight} onChange={setAlignRight} id="align" />
                    </div>

                    {/* Readable Font */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Convertshape size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">גופן קריא במיוחד</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">החלפה לפונט מערכת תקני</span>
                        </div>
                      </div>
                      <CustomSwitch checked={readableFont} onChange={setReadableFont} id="font" />
                    </div>
                  </>
                )}

                {/* ── TAB 2: Colors & Contrast ── */}
                {activeTab === 'colors' && (
                  <>
                    {/* High Contrast */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Sun1 size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">ניגודיות גבוהה</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">הגברת ניגודיות הטקסט והצבעים</span>
                        </div>
                      </div>
                      <CustomSwitch checked={highContrast} onChange={setHighContrast} id="contrast" />
                    </div>

                    {/* Grayscale Mode */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Eye size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">גווני אפור</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">המרת תצוגת האתר לשחור-לבן</span>
                        </div>
                      </div>
                      <CustomSwitch checked={grayscale} onChange={setGrayscale} id="grayscale" />
                    </div>

                    {/* Invert Colors */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Moon size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">צבעים הפוכים</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">היפוך צבעים כהה למניעת סנוור</span>
                        </div>
                      </div>
                      <CustomSwitch checked={invertColors} onChange={setInvertColors} id="invert" />
                    </div>

                    {/* Dark Contrast Background */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Flash size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">ניגודיות כהה</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">רקע כהה עם טקסט בהיר וחד</span>
                        </div>
                      </div>
                      <CustomSwitch checked={darkContrast} onChange={setDarkContrast} id="darkbg" />
                    </div>

                    {/* Highlight Links */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <DocumentText size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">הדגשת קישורים</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">הוספת קו תחתון ורקע לקישורים</span>
                        </div>
                      </div>
                      <CustomSwitch checked={highlightLinks} onChange={setHighlightLinks} id="links" />
                    </div>

                    {/* Highlight Headings */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <MagicStar size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">הדגשת כותרות</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">סימון בולט לכל כותרות האתר</span>
                        </div>
                      </div>
                      <CustomSwitch checked={highlightHeadings} onChange={setHighlightHeadings} id="headings" />
                    </div>
                  </>
                )}

                {/* ── TAB 3: Focus & Assist Tools ── */}
                {activeTab === 'tools' && (
                  <>
                    {/* Large Cursor */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <DirectNotification size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">סמן עכבר מוגדל</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">הגדלת סמן העכבר לניווט קל</span>
                        </div>
                      </div>
                      <CustomSwitch checked={largeCursor} onChange={setLargeCursor} id="cursor" />
                    </div>

                    {/* Reading Line */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Maximize1 size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">סרגל קריאה</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">פס מעקב אופקי המלווה את העכבר</span>
                        </div>
                      </div>
                      <CustomSwitch checked={readingLine} onChange={setReadingLine} id="rline" />
                    </div>

                    {/* Reading Mask */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <EyeSlash size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">מסכת קריאה</span>
                          <span className="block text-[10.5px] font-[#0061FF]">הצללת המסך והשארת חלון מיקוד</span>
                        </div>
                      </div>
                      <CustomSwitch checked={readingMask} onChange={setReadingMask} id="rmask" />
                    </div>

                    {/* Focus Box */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <TickCircle size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">הדגשת פוקוס</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">מסגרת בולטת לרכיבים בפוקוס</span>
                        </div>
                      </div>
                      <CustomSwitch checked={focusBox} onChange={setFocusBox} id="focus" />
                    </div>

                    {/* Stop Animations */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <CloseCircle size={18} color="#0061FF" />
                        <div>
                          <span className="block text-[13px] font-black text-slate-800">עצירת הנפשות</span>
                          <span className="block text-[10.5px] font-semibold text-slate-500">ביטול אפקטים ותנועות באתר</span>
                        </div>
                      </div>
                      <CustomSwitch checked={stopAnimations} onChange={setStopAnimations} id="animations" />
                    </div>
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[12px] font-extrabold">
                <button
                  type="button"
                  onClick={resetAll}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Refresh2 size={15} color="currentColor" />
                  <span>איפוס הגדרות ({activeCount})</span>
                </button>

                <a
                  href="/accessibility-statement"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-[#0061FF] hover:bg-blue-100 transition"
                >
                  <InfoCircle size={15} color="#0061FF" />
                  <span>הצהרת נגישות</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
