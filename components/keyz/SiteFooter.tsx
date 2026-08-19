import Link from "next/link";

const ABOUT_LINKS = [
  { label: "מי אנחנו", href: "/about" },
  { label: "חכם לדעת", href: "/guides" },
  { label: "שאלות ותשובות", href: "/faq" },
  { label: "צור קשר", href: "/contact" },
  { label: "מפת אתר", href: "/site-map" },
];

const LEGAL_LINKS = [
  { label: "תנאי שימוש", href: "/terms" },
  { label: "מדיניות פרטיות", href: "/privacy-policy" },
  { label: "הצהרת נגישות", href: "/accessibility-statement" },
  { label: "מדיניות עוגיות", href: "/cookie-policy" },
];

const SERVICE_LINKS = [
  { label: "חיפוש דירות להשכרה", href: "/real-estate?transaction=rent" },
  { label: "חיפוש דירות למכירה", href: "/real-estate?transaction=sale" },
  { label: "אתי — עוזרת AI", href: "/#ati" },
  { label: "פרסום נכס בחינם", href: "/publish" },
  { label: "כניסה למתווכים ועסקים", href: "/publisher" },
];

export default function SiteFooter() {
  return (
    <footer className="w-full bg-white border-t border-slate-100 py-12 text-navy">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 md:gap-16">
          {/* Right side (RTL): Brand Logo, Copy & Social Icons */}
          <div className="flex flex-col items-start gap-4 max-w-[320px]">
            {/* Bold Stylized Brand Logo */}
            <Link href="/" className="inline-block group">
              <span className="text-4xl font-black tracking-tighter text-navy uppercase font-sans">
                rently
              </span>
            </Link>

            <p className="text-[13px] text-slate-500 font-medium mt-3">
              © 2026 רנטלי מרקטפלייס בע"מ. כל הזכויות שמורות
            </p>
          </div>

          {/* Left side (RTL): 3 Link Columns (אודות, משפטי, שירותים) */}
          <div className="grid grid-cols-3 gap-8 md:gap-14 w-full md:w-auto">
            {/* Column 1: אודות */}
            <div>
              <h3 className="font-extrabold text-[15px] text-[#2563EB] mb-4">
                אודות
              </h3>
              <ul className="space-y-2.5">
                {ABOUT_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-slate-700 hover:text-navy text-[13.5px] font-medium transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: משפטי */}
            <div>
              <h3 className="font-extrabold text-[15px] text-[#2563EB] mb-4">
                משפטי
              </h3>
              <ul className="space-y-2.5">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-slate-700 hover:text-navy text-[13.5px] font-medium transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: שירותים */}
            <div>
              <h3 className="font-extrabold text-[15px] text-[#2563EB] mb-4">
                שירותים
              </h3>
              <ul className="space-y-2.5">
                {SERVICE_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-slate-700 hover:text-navy text-[13.5px] font-medium transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
