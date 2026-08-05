import type { Property } from './types'

// Fallback listings (Tel Aviv / Gush Dan) shown when the live API is unauthenticated
// or unreachable, so the map, control bar and chat all stay demoable on localhost.
// ponytail: static seed; real data replaces it the moment a token authenticates.
const img = (id: number) => `https://picsum.photos/seed/rently${id}/640/480`

export const SAMPLE_PROPERTIES: Property[] = [
  { id: 's1', lat: 32.0809, lon: 34.7806, price: 7200, rooms: 3, sizeM2: 78, floor: '2', city: 'תל אביב', neighborhood: 'לב העיר', transactionType: 'rent', status: 'available', imageUrls: [img(1)], smartTags: ['משופצת', 'מרפסת'] },
  { id: 's2', lat: 32.0714, lon: 34.7736, price: 9500, rooms: 4, sizeM2: 105, floor: '5', city: 'תל אביב', neighborhood: 'הכרם', transactionType: 'rent', status: 'available', imageUrls: [img(2)], smartTags: ['חדשה', 'חניה'] },
  { id: 's3', lat: 32.0891, lon: 34.7745, price: 6100, rooms: 2.5, sizeM2: 62, floor: '1', city: 'תל אביב', neighborhood: 'הצפון הישן', transactionType: 'rent', status: 'available', imageUrls: [img(3)], smartTags: ['ממ״ד'] },
  { id: 's4', lat: 32.0668, lon: 34.7783, price: 8300, rooms: 3.5, sizeM2: 88, floor: '3', city: 'תל אביב', neighborhood: 'נווה צדק', transactionType: 'rent', status: 'available', imageUrls: [img(4)], smartTags: ['מעלית', 'משופצת'] },
  { id: 's5', lat: 32.0953, lon: 34.7812, price: 11800, rooms: 4, sizeM2: 120, floor: '8', city: 'תל אביב', neighborhood: 'בבלי', transactionType: 'rent', status: 'available', imageUrls: [img(5)], smartTags: ['נוף', 'חניה כפולה'] },
  { id: 's6', lat: 32.0760, lon: 34.7910, price: 5400, rooms: 2, sizeM2: 52, floor: '4', city: 'תל אביב', neighborhood: 'פלורנטין', transactionType: 'rent', status: 'available', imageUrls: [img(6)], smartTags: ['מרפסת'] },
  { id: 's7', lat: 32.0625, lon: 34.7699, price: 14500, rooms: 5, sizeM2: 150, floor: '2', city: 'תל אביב', neighborhood: 'שבזי', transactionType: 'rent', status: 'available', imageUrls: [img(7)], smartTags: ['גינה', 'פרטי'] },
  { id: 's8', lat: 32.0850, lon: 34.7920, price: 7800, rooms: 3, sizeM2: 80, floor: '6', city: 'תל אביב', neighborhood: 'רמת אביב', transactionType: 'rent', status: 'available', imageUrls: [img(8)], smartTags: ['קרוב לאונ׳'] },
]
