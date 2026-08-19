import type { Metadata } from 'next'
import FaqClient from './FaqClient'

export const metadata: Metadata = {
  title: 'שאלות נפוצות | Rently',
  description:
    'כל התשובות על רנטלי במקום אחד: איך אתי מוצאת דירות, סיורי 360, פרסום דירה, חוזה דיגיטלי, כלים למתווכים ויצירת קשר.',
}

export default function FaqPage() {
  return <FaqClient />
}
