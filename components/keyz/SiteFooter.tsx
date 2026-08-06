import { Instagram, Facebook, Whatsapp } from "iconsax-react";

const APP_LINKS = [
  { label: "חיפוש דירות", href: "/real-estate" },
  { label: "אתי — חיפוש AI", href: "/#ati" },
  { label: "סיורי 360", href: "/guides/how-360-tours-work" },
  { label: "פרסום דירה", href: "/publish" },
];

const OWNER_LINKS = [
  { label: "פרסום דירה בחינם", href: "/publish" },
  { label: "כלים למתווכים", href: "/publish" },
  { label: "הדמיית AI", href: "/#services" },
  { label: "חוזה דיגיטלי", href: "/#services" },
];

const SOCIALS = [
  { label: "Instagram", href: "#", Icon: Instagram },
  { label: "Facebook", href: "#", Icon: Facebook },
  { label: "WhatsApp", href: "#", Icon: Whatsapp },
];

export default function SiteFooter() {
  return (
    <footer className="bg-navy-deep text-white rounded-t-[36px] pt-14 pb-8 mt-20">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10">
          <div>
            <img
              src="/logo.png"
              alt="Rently"
              className="h-10 w-auto brightness-0 invert"
            />
            <p className="text-white/70 text-sm mt-3">מוצאים בית, בכיף.</p>
          </div>

          <div>
            <h3 className="font-bold text-[15px] mb-4">האפליקציה</h3>
            <ul className="space-y-2">
              {APP_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/70 hover:text-white text-sm transition"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[15px] mb-4">לבעלי נכסים</h3>
            <ul className="space-y-2">
              {OWNER_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/70 hover:text-white text-sm transition"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-[15px] mb-4">יצירת קשר</h3>
            <a
              href="mailto:support@rently.co.il"
              className="text-white/70 hover:text-white text-sm transition"
            >
              support@rently.co.il
            </a>
            <div className="flex gap-3 mt-4">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  <Icon size={20} color="currentColor" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <p>© 2026 Rently. כל הזכויות שמורות.</p>
          <p>
            <a href="/terms" className="hover:text-white transition">
              תנאי שימוש
            </a>
            {" · "}
            <a href="/privacy-policy" className="hover:text-white transition">
              פרטיות
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
