import type { MetadataRoute } from 'next'

// Anti-scraping Layer 0 (policy) — never rely on this alone, it's advisory
// only for well-behaved crawlers. Real enforcement is in middleware.ts.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/publisher/'],
    },
  }
}
