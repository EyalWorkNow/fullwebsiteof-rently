import { Instagram, Facebook, Youtube } from "iconsax-react";

// TikTok custom icon SVG since iconsax doesn't have it built-in
function TikTokIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

// LinkedIn custom icon SVG
function LinkedinIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

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
  { label: "חיפוש דירות להשכרה", href: "/real-estate" },
  { label: "חיפוש דירות למכירה", href: "/real-estate" },
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
            <a href="/" className="inline-block group">
              <span className="text-4xl font-black tracking-tighter text-navy uppercase font-sans">
                rently
              </span>
            </a>

            <div className="flex items-center gap-3 mt-1">
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-navy hover:text-navy transition"
              >
                <LinkedinIcon className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-navy hover:text-navy transition"
              >
                <Youtube size={16} color="currentColor" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-navy hover:text-navy transition"
              >
                <Instagram size={16} color="currentColor" />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-navy hover:text-navy transition"
              >
                <Facebook size={16} color="currentColor" />
              </a>
              <a
                href="#"
                aria-label="TikTok"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:border-navy hover:text-navy transition"
              >
                <TikTokIcon className="w-4 h-4" />
              </a>
            </div>

            <p className="text-[13px] text-slate-500 font-medium mt-3">
              © 2026 רנטלי מרקטפלייס בע"מ. כל הזכויות שמורות
            </p>
          </div>

          {/* Left side (RTL): 3 Link Columns (אודות, משפטי, שירותים) */}
          <div className="grid grid-cols-3 gap-8 md:gap-14 w-full md:w-auto">
            {/* Column 1: אודות */}
            <div>
              <h3 className="font-extrabold text-[15px] text-[#0061FF] mb-4">
                אודות
              </h3>
              <ul className="space-y-2.5">
                {ABOUT_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-slate-700 hover:text-navy text-[13.5px] font-medium transition"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: משפטי */}
            <div>
              <h3 className="font-extrabold text-[15px] text-[#0061FF] mb-4">
                משפטי
              </h3>
              <ul className="space-y-2.5">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-slate-700 hover:text-navy text-[13.5px] font-medium transition"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: שירותים */}
            <div>
              <h3 className="font-extrabold text-[15px] text-[#0061FF] mb-4">
                שירותים
              </h3>
              <ul className="space-y-2.5">
                {SERVICE_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-slate-700 hover:text-navy text-[13.5px] font-medium transition"
                    >
                      {link.label}
                    </a>
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
