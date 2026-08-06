import type { Metadata } from 'next'
import LandlordPortal from './LandlordPortal'

export const metadata: Metadata = {
  title: 'אזור בעל הדירה | Rently',
  description:
    'פורטל בעלי דירות של Rently — מפרסמים דירה בשיחה עם אריק, מנהלים יומן ביקורים ורואים את הנכסים, מסונכרן עם האפליקציה.',
}

export default function LandlordPage() {
  return (
    <main className="pt-16 bg-[#F8FAFC] min-h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <LandlordPortal />
      </div>
    </main>
  )
}
