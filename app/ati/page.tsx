import type { Metadata } from 'next'
import AtiWorkspace from './AtiWorkspace'

export const metadata: Metadata = {
  title: 'אתי — העוזרת האישית | Rently',
  description: 'חיפוש דירות בשפה חופשית — שיחה עם אתי, העוזרת האישית של Rently',
}

export default function AtiPage() {
  return (
    <main className="pt-[68px] md:pt-24 bg-slate-50 min-h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col h-[calc(100dvh-68px)] md:h-[calc(100vh-96px)] overflow-hidden">
        <AtiWorkspace />
      </div>
    </main>
  )
}
