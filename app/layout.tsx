import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ScrollProgress from "@/components/ScrollProgress";
import BackToTop from "@/components/BackToTop";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Rently — מצא את הדירה שלך בסוויפ אחד",
  description: "Rently מביאה לך חווית גילוי מוכרת ומהנה — גולשים בין דירות כמו שמגלים אנשים. מסנן, מחליק, מתאהב.",
  openGraph: {
    title: "Rently — מצא את הדירה שלך בסוויפ אחד",
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
          {children}
          <BackToTop />
        </LanguageProvider>
      </body>
    </html>
  );
}
