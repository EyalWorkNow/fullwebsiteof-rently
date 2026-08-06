import type { Metadata } from 'next'
import PublisherPortal from './PublisherPortal'

export const metadata: Metadata = {
  title: 'בעל נכס | Rently',
  description: 'עזרא, סקירת ביצועים, קהל, נכסים ויומן — הכול במקום אחד עבור בעלי דירות ומתווכים.',
}

export default function PublisherPage() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC] pt-16">
      <div className="h-[calc(100vh-64px)] flex-1 overflow-hidden">
        <PublisherPortal />
      </div>
    </main>
  )
}
