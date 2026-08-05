import type { Metadata } from 'next'
import Browse from './Browse'

export const metadata: Metadata = {
  title: 'דירות בכל הארץ — Rently',
  description: 'כל הדירות הפעילות ברנטלי — מתעדכן ישירות מהאפליקציה',
}

export default function RealEstatePage() {
  return (
    <main className="pt-28">
      <Browse />
    </main>
  )
}
