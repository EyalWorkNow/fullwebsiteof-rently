import type { Metadata } from 'next'
import LandlordPortal from './LandlordPortal'

export const metadata: Metadata = {
  title: 'אזור בעל הדירה | Rently',
  description:
    'פורטל בעלי דירות של Rently — מפרסמים דירה בשיחה עם אריק, מנהלים יומן ביקורים ורואים את הנכסים, מסונכרן עם האפליקציה.',
}

export default function LandlordPage() {
  return (
    <main className="pt-24 pb-20 min-h-[70vh]">
      <LandlordPortal />
    </main>
  )
}
