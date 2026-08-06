import type { Metadata } from 'next'
import EzraWorkspace from './EzraWorkspace'

export const metadata: Metadata = {
  title: 'עזרא — עוזר הפרסום | Rently',
  description: 'מעלים דירה בשיחה עם עזרא — עוזר הפרסום האישי של Rently. מספרים לו על הדירה, הוא בונה את המודעה.',
}

export default function EzraPage() {
  return (
    <main className="pt-16 bg-[#F8FAFC] min-h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <EzraWorkspace />
      </div>
    </main>
  )
}
