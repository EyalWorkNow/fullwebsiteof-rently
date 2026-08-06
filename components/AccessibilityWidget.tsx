'use client'

// open-nagish (github.com/leon2589/open-nagish) — SI 5568 / WCAG 2.1 AA
// accessibility toolbar. Bottom-right so it doesn't collide with BackToTop's
// fixed bottom-left button. Points at the site's real, already-written
// accessibility statement instead of the widget's auto-generated one.

import { useEffect } from 'react'
import { init, type OpenNagishWidget } from 'open-nagish'

export default function AccessibilityWidget() {
  useEffect(() => {
    let widget: OpenNagishWidget | null = init({
      lang: 'he',
      position: 'bottom-right',
      statementUrl: '/accessibility-statement',
    })
    return () => {
      widget?.destroy()
      widget = null
    }
  }, [])

  return null
}
