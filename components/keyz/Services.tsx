import { MagicStar, Video, DocumentText, Map1, type Icon } from "iconsax-react";

const SERVICES: { icon: Icon; title: string; desc: string }[] = [
  {
    icon: MagicStar,
    title: "הדמיית AI",
    desc: "מעלים תמונה של חדר — ומקבלים הדמיה מעוצבת ומרוהטת תוך שניות",
  },
  {
    icon: Video,
    title: "סיורי 360",
    desc: "מצלמים סיבוב אחד בטלפון ומקבלים סיור וירטואלי מקצועי לדירה",
  },
  {
    icon: DocumentText,
    title: "חוזה דיגיטלי",
    desc: "חוזה שכירות עם חתימה דיגיטלית מאובטחת — בלי הדפסות ובלי פגישות",
  },
  {
    icon: Map1,
    title: "ניתוח שכונה",
    desc: "ציוני סביבה אמיתיים: חינוך, תחבורה, פארקים, רעש ומחירים באזור",
  },
];

export default function Services() {
  return (
    <section id="services" className="py-12 scroll-mt-24">
      <div className="max-w-[1200px] mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-black text-navy mb-2">
          שירותים חכמים ב־Rently
        </h2>
        <p className="text-secondary-text mb-8">
          כלים שהופכים חיפוש ופרסום דירה לחוויה אחרת
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICES.map(({ icon: ServiceIcon, title, desc }) => (
            <div
              key={title}
              className="bg-white border border-border-app rounded-3xl p-6 hover:border-primary hover:-translate-y-1 transition-all card-shadow"
            >
              <div className="w-[52px] h-[52px] rounded-2xl bg-primary-light2 text-primary flex items-center justify-center">
                <ServiceIcon size={26} variant="Bulk" color="currentColor" />
              </div>
              <h3 className="text-[17px] font-black text-navy mt-4">{title}</h3>
              <p className="text-[13.5px] text-secondary-text mt-2 leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
