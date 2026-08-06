'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building } from 'iconsax-react'
import type { User } from 'firebase/auth'
import type { Property } from '@/lib/live/types'
import { addressLabel, cityLabel, priceLabel, primaryImage } from '@/lib/live/api'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import { fetchMyProperties } from './portal-api'

const PROPERTIES_REASON = 'כדי לראות את הנכסים שפרסמת ולנהל אותם'

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  active: { text: 'פעיל', cls: 'bg-success/10 text-success' },
  paused: { text: 'מושהה', cls: 'bg-amber-100 text-amber-600' },
  draft: { text: 'טיוטה', cls: 'bg-cloud text-secondary-text' },
  rented: { text: 'הושכר', cls: 'bg-primary-light2 text-primary' },
}

export default function PropertiesTab({ user }: { user: User | null }) {
  const [items, setItems] = useState<Property[] | null>(null)
  const [error, setError] = useState(false)
  const { requireAuth } = useAuthGate()
  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setItems([])
      return
    }
    let alive = true
    fetchMyProperties(uid)
      .then((props) => alive && setItems(props))
      .catch(() => {
        if (alive) {
          setItems([])
          setError(true)
        }
      })
    return () => {
      alive = false
    }
  }, [uid])

  // This view genuinely needs a uid to query — so instead of a wall we show an
  // inviting empty state whose button opens the same gate modal.
  if (!uid) {
    return (
      <div className="text-center bg-cloud rounded-[28px] px-6 py-12 max-w-[500px] mx-auto">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-primary-light2 text-primary items-center justify-center">
          <Building size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="font-black text-navy mt-4">הנכסים שלך יופיעו כאן</div>
        <p className="text-secondary-text text-sm mt-1.5 leading-relaxed">
          מתחברים עם אותו חשבון כמו באפליקציה, וכל הדירות שפרסמת מופיעות כאן — מסונכרן לגמרי.
        </p>
        <button
          onClick={() => requireAuth(PROPERTIES_REASON, () => {})}
          className="mt-5 inline-flex items-center justify-center gap-2 bg-white border border-border-app hover:border-primary/40 transition-colors rounded-full px-5 py-2.5 font-bold text-navy text-sm"
        >
          <span className="w-5 h-5 rounded-full bg-cloud border border-border-app flex items-center justify-center text-[10px] font-black text-primary">
            G
          </span>
          התחברות עם Google
        </button>
      </div>
    )
  }

  if (items === null) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-secondary-text bg-cloud rounded-2xl px-4 py-10 max-w-[500px] mx-auto">
        לא הצלחנו לטעון את הנכסים כרגע. נסו לרענן את העמוד.
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center bg-cloud rounded-[28px] px-6 py-12 max-w-[500px] mx-auto">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-primary-light2 text-primary items-center justify-center">
          <Building size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="font-black text-navy mt-4">עוד אין נכסים</div>
        <p className="text-secondary-text text-sm mt-1.5">
          מפרסמים את הדירה הראשונה בשיחה קצרה עם אריק — בלשונית &quot;אריק — הוספת דירה&quot;.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((p) => {
        const img = primaryImage(p)
        const status = STATUS_LABELS[p.status ?? 'active'] ?? STATUS_LABELS.active
        return (
          <Link
            key={p.id}
            href={`/listing/${p.id}`}
            className="bg-white border border-border-app rounded-[22px] card-shadow overflow-hidden hover:border-primary/40 transition-colors group"
          >
            <div className="h-40 bg-cloud relative">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-secondary-text">
                  <Building size={32} variant="Bulk" color="currentColor" />
                </div>
              )}
              <span
                className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold badge-shadow ${status.cls} bg-white/90`}
              >
                {status.text}
              </span>
            </div>
            <div className="p-4">
              <div className="font-black text-navy truncate group-hover:text-primary transition-colors">
                {addressLabel(p)}
              </div>
              <div className="text-secondary-text text-xs mt-0.5 truncate">{cityLabel(p)}</div>
              <div className="flex items-center justify-between mt-2.5">
                <span className="font-black text-primary">{priceLabel(p)}</span>
                <span className="text-secondary-text text-xs">
                  {p.rooms ? `${p.rooms} חד׳` : ''}
                  {p.sizeM2 ? ` · ${p.sizeM2} מ"ר` : ''}
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
