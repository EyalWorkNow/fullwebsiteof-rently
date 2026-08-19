import type { Metadata } from "next";
import Link from "next/link";
import { Book1, Wallet2, Video, PercentageCircle, type Icon } from "iconsax-react";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "חכם לדעת | Rently",
  description: "מדריכים קצרים לשוכרים ולמשכירים — שיחסכו לכם כסף וכאב ראש.",
};

const iconMap: Record<string, Icon> = {
  book: Book1,
  wallet: Wallet2,
  video: Video,
  percentage: PercentageCircle,
};

export default function GuidesPage() {
  return (
    <main className="pt-28 pb-20">
      <div className="max-w-[980px] mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-black text-navy">חכם לדעת</h1>
        <p className="text-secondary-text mt-2">
          מדריכים קצרים שיחסכו לכם כסף וכאב ראש
        </p>

        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          {guides.map((guide) => {
            const IconComp = iconMap[guide.icon] ?? Book1;
            return (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="block bg-white rounded-3xl border border-border-app p-6 card-shadow hover:border-primary hover:-translate-y-1 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-light2 text-primary flex items-center justify-center">
                  <IconComp size={26} variant="Bold" color="currentColor" />
                </div>
                <h2 className="text-[18px] font-black text-navy mt-4">
                  {guide.title}
                </h2>
                <p className="text-[14px] text-secondary-text mt-2">
                  {guide.teaser}
                </p>
                <div className="text-[12px] font-bold text-primary mt-4">
                  {guide.minutes} דקות קריאה
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
