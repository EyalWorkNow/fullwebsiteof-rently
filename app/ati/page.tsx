import type { Metadata } from 'next'
import AtiWorkspace from './AtiWorkspace'

export const metadata: Metadata = {
  title: 'אתי — העוזרת האישית | Rently',
  description: 'חיפוש דירות בשפה חופשית — שיחה עם אתי, העוזרת האישית של Rently',
}

export default function AtiPage() {
  return (
    <main className="pt-[68px] md:pt-20 bg-slate-50 h-dvh w-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <AtiWorkspace />
      </div>
    </main>
  )
}
