import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ScrollProgress from "@/components/ScrollProgress";
import BackToTop from "@/components/BackToTop";
import TopBar from "@/components/keyz/TopBar";
import SiteFooter from "@/components/keyz/SiteFooter";
import { AuthGateModal } from "@/components/keyz/auth/AuthGate";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Rently — כיף שבאת, איזו דירה נחפש היום?",
  description: "חיפוש דירות עם AI — אתי מוצאת לך את הדירה הבאה, עם נתוני סביבה אמיתיים, סיורי 360 והתאמה חכמה.",
  icons: { icon: "/brand/app_icon.png", apple: "/brand/app_icon.png" },
  openGraph: {
    title: "Rently — כיף שבאת, איזו דירה נחפש היום?",
    description: "האפליקציה הכי חכמה לחיפוש דירה בישראל",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-navy">
        <LanguageProvider>
          <ScrollProgress />
          <TopBar />
          {children}
          <SiteFooter />
          <BackToTop />
          {/* Action-triggered registration gate — rendered once for the whole app. */}
          <AuthGateModal />
        </LanguageProvider>
      </body>
    </html>
  );
}
