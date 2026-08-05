import type { Metadata } from 'next'
import AtiWorkspace from './AtiWorkspace'

export const metadata: Metadata = {
  title: 'אתי — העוזרת האישית | Rently',
  description: 'חיפוש דירות בשפה חופשית — שיחה עם אתי, העוזרת האישית של Rently',
}

export default function AtiPage() {
  // pt-24 clears the fixed 64px header (+ breathing room); the workspace fills
  // the remaining viewport so the input bar always sits at the bottom.
  return (
    <main className="pt-24">
      <div className="h-[calc(100vh-96px)] min-h-[480px]">
        <AtiWorkspace />
      </div>
    </main>
  )
}
