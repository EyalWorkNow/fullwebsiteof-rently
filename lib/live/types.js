export function primaryImage(p) {
    if (p.imageUrls?.length)
        return p.imageUrls[0];
    if (Array.isArray(p.media)) {
        const img = p.media.find((m) => m && (m.type ?? 'image') === 'image');
        return img?.url;
    }
    return undefined;
}
export function priceLabel(p) {
    const n = p.price ?? 0;
    return '₪' + n.toLocaleString('he-IL');
}
/** Shared lifestyle / pet-type contracts (mirror rental_models.dart maps). */
export const LIFESTYLE_LABELS = {
    chiloni: 'חילוני/ת', masorti: 'מסורתי/ת', dati: 'דתי/ה', charedi: 'חרדי/ת',
};
export const PET_TYPE_LABELS = {
    none: 'אין', cat: 'חתול', dog_small: 'כלב קטן', dog_large: 'כלב גדול', other: 'אחר',
};
