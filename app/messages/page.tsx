import type { Metadata } from 'next'
import TenantMessages from './TenantMessages'

export const metadata: Metadata = {
  title: 'השיחות שלי | Rently',
  description: 'השיחות שלך עם בעלי דירות שאישרו את הפנייה שלך.',
}

export default function MessagesPage() {
  return (
    <main className="pt-28 pb-20 px-4">
      <div className="max-w-[760px] mx-auto w-full mb-6">
        <h1 className="text-2xl font-black text-navy">השיחות שלי</h1>
        <p className="text-secondary-text text-sm mt-1">שיחות עם בעלי דירות על נכסים שהתעניינת בהם</p>
      </div>
      <TenantMessages />
    </main>
  )
}
