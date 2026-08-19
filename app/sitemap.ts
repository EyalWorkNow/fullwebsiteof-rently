import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/site'
import { fetchActivePropertyIds } from '@/lib/server/upstream'

// Static, always-present routes. Listing pages are appended best-effort —
// if the upstream is down the sitemap still serves these.
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/real-estate', priority: 0.9, changeFrequency: 'daily' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/guides', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/accessibility-statement', priority: 0.3, changeFrequency: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_ORIGIN}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  // Best-effort: live listing pages (fail-soft to just the static routes).
  const ids = await fetchActivePropertyIds(300)
  for (const id of ids) {
    entries.push({
      url: `${SITE_ORIGIN}/listing/${encodeURIComponent(id)}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    })
  }

  return entries
}
