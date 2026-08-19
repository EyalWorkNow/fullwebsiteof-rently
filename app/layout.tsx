import type { Metadata } from "next";
import { SITE_ORIGIN } from "@/lib/site";
import { Heebo } from "next/font/google";
import "./globals.css";
import ScrollProgress from "@/components/ScrollProgress";
import BackToTop from "@/components/BackToTop";
import TopBar from "@/components/keyz/TopBar";
import SiteFooter from "@/components/keyz/SiteFooter";
import { AuthGateModal } from "@/components/keyz/auth/AuthGate";
import AccessibilityWidget from "@/components/AccessibilityWidget";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  // Resolves every relative OG/twitter/canonical URL to an absolute one.
  metadataBase: new URL(SITE_ORIGIN),
  title: "Rently — כיף שבאת, איזו דירה נחפש היום?",
  description: "חיפוש דירות עם AI — אתי מוצאת לך את הדירה הבאה, עם נתוני סביבה אמיתיים, סיורי 360 והתאמה חכמה.",
  icons: {
    icon: [
      { url: "/rently%20icon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/rently%20icon.svg"],
    apple: [{ url: "/rently%20icon.svg" }],
  },
  openGraph: {
    title: "Rently — כיף שבאת, איזו דירה נחפש היום?",
    description: "האפליקציה הכי חכמה לחיפוש דירה בישראל",
    type: "website",
    siteName: "Rently",
    // Default share image — listing pages override with the property photo.
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary",
    title: "Rently — כיף שבאת, איזו דירה נחפש היום?",
    description: "האפליקציה הכי חכמה לחיפוש דירה בישראל",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-navy">
        {/* Skip-to-content: first focusable element, visually hidden until focused. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[200] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:font-bold focus:text-white focus:shadow-lg"
        >
          דילוג לתוכן
        </a>
        <ScrollProgress />
        <TopBar />
        <div id="main" tabIndex={-1}>
          {children}
        </div>
        <SiteFooter />
        <BackToTop />
        <AccessibilityWidget />
        {/* Action-triggered registration gate — rendered once for the whole app. */}
        <AuthGateModal />
      </body>
    </html>
  );
}
