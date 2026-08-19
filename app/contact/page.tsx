import type { Metadata } from 'next'
import ContactClient from './ContactClient'

export const metadata: Metadata = {
  title: 'צור קשר | Rently',
  description:
    'יש שאלה או בקשה? צוות רנטלי כאן בשבילכם — טופס פנייה מהיר או במייל support@rently.co.il, ימים א׳–ה׳ 9:00–18:00.',
}

export default function ContactPage() {
  return <ContactClient />
}
