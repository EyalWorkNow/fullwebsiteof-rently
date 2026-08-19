import type { Metadata } from 'next'
import ListingClient from './ListingClient'
import { fetchPropertyServer } from '@/lib/server/upstream'

type Props = { params: Promise<{ id: string }> }

// The page body is client-fetched (skeleton first), so crawlers/WhatsApp only
// see what generateMetadata resolves server-side — this is where the listing's
// real title/description/OG image come from. Fails soft to site defaults.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const p = await fetchPropertyServer(id)

  if (!p) {
    return {
      title: 'דירה להשכרה | Rently',
      description: 'צפו בדירה הזו ובעוד אלפי דירות להשכרה ולמכירה ברנטלי — חיפוש דירות חכם עם AI.',
    }
  }

  // Same presentation as the page itself (lib/live/api.ts labels).
  const address = p.street
    ? `${p.street}${p.streetNumber ? ' ' + p.streetNumber : ''}`
    : p.neighborhood || p.city || 'דירה'
  const price =
    p.transactionType === 'sale'
      ? `₪${(p.price ?? 0).toLocaleString('he-IL')}`
      : `₪${(p.price ?? 0).toLocaleString('he-IL')}/חודש`
  const title = [address, p.city, price].filter(Boolean).join(' · ')

  const bits = [
    p.rooms ? `${p.rooms} חדרים` : null,
    p.sizeM2 ? `${p.sizeM2} מ״ר` : null,
    p.floor ? `קומה ${p.floor}` : null,
    p.neighborhood && p.city ? `${p.neighborhood}, ${p.city}` : p.city || null,
  ].filter(Boolean)
  const description = `${p.transactionType === 'sale' ? 'למכירה' : 'להשכרה'}: ${address}${
    bits.length ? ' — ' + bits.join(' · ') : ''
  }. כל הפרטים, תמונות ונתוני סביבה ברנטלי.`

  const image =
    p.media?.find((m) => m?.url && (!m.type || m.type.startsWith('image')))?.url ??
    p.imageUrls?.[0] ??
    null

  return {
    title: `${title} | Rently`,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

// Next 16: params is a Promise — thin server wrapper awaits it and hands the
// id to the client component that does the actual fetching/rendering.
export default async function ListingPage({ params }: Props) {
  const { id } = await params
  return <ListingClient id={id} />
}
