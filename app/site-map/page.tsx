import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מפת האתר | Rently",
  description: "כל עמודי האתר של Rently במקום אחד.",
};

const groups: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "ראשי",
    links: [{ href: "/", label: "דף הבית" }],
  },
  {
    heading: "דירות",
    links: [
      { href: "/real-estate?transaction=rent", label: "דירות להשכרה" },
      { href: "/real-estate?transaction=sale", label: "דירות למכירה" },
    ],
  },
  {
    heading: "פרסום",
    links: [{ href: "/publish", label: "פרסום דירה" }],
  },
  {
    heading: "מידע",
    links: [
      { href: "/about", label: "אודות" },
      { href: "/contact", label: "יצירת קשר" },
      { href: "/faq", label: "שאלות נפוצות" },
      { href: "/guides", label: "חכם לדעת — מדריכים" },
    ],
  },
  {
    heading: "משפטי",
    links: [
      { href: "/terms", label: "תנאי שימוש" },
      { href: "/privacy-policy", label: "מדיניות פרטיות" },
      { href: "/accessibility-statement", label: "הצהרת נגישות" },
      { href: "/cookie-policy", label: "מדיניות עוגיות" },
    ],
  },
];

export default function SiteMapPage() {
  return (
    <main className="pt-28 pb-20">
      <div className="max-w-[760px] mx-auto px-4">
        <h1 className="text-3xl font-black text-navy">מפת האתר</h1>
        <div className="grid sm:grid-cols-2 gap-8 mt-8">
          {groups.map((group) => (
            <section key={group.heading}>
              <h2 className="text-lg font-black text-navy mb-3">
                {group.heading}
              </h2>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-primary font-semibold hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
