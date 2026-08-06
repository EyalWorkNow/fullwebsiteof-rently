import type { Metadata } from 'next'
import AtiWorkspace from './AtiWorkspace'

export const metadata: Metadata = {
  title: 'אתי — העוזרת האישית | Rently',
  description: 'חיפוש דירות בשפה חופשית — שיחה עם אתי, העוזרת האישית של Rently',
}

export default function AtiPage() {
  return (
    <main className="pt-16 bg-[#F8FAFC] min-h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <AtiWorkspace />
      </div>
    </main>
  )
}

