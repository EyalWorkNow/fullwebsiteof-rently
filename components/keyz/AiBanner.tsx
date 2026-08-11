import { MagicStar } from "iconsax-react";
import PropertyCard from "./PropertyCard";
import type { Property } from "@/lib/live/types";

const SAMPLE_ATI_PROPERTY: Property = {
  id: "sample-ati-1",
  lat: 32.0853,
  lon: 34.7818,
  price: 7200,
  rooms: 3,
  sizeM2: 78,
  floor: "3",
  city: "תל אביב",
  neighborhood: "צפון ישן",
  street: "הירקון",
  streetNumber: 12,
  propertyType: "דירה",
  transactionType: "rent",
  agencyListing: false,
  imageUrls: [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
  ],
  smartTags: ["🌳 ליד פארק", "🏫 ליד בית ספר", "🚉 ליד תחבורה"]
};

export default function AiBanner() {
  return (
    <section id="ati" className="w-full py-14">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="rounded-[36px] bg-navy-deep overflow-hidden relative grid md:grid-cols-2 items-center p-10 md:p-14 gap-10">
          {/* Soft radial glow */}
          <div className="absolute bg-primary/25 blur-3xl rounded-full w-[420px] h-[420px] top-[-120px] left-[-120px]" />

          {/* Text side */}
          <div className="relative">
            <span className="bg-white/10 text-white rounded-full px-4 py-1.5 text-[13px] font-bold inline-flex gap-1.5 items-center">
              <MagicStar size={16} variant="Bold" />
              אתי · העוזרת החכמה
            </span>
            <h2 className="text-white text-3xl md:text-5xl font-black leading-tight mt-4">
              מספרים ל<span className="text-[#60A5FA]">אתי</span> מה חשוב לכם.
              היא כבר תמצא.
            </h2>
            <p className="text-white/70 mt-4 max-w-[440px]">
              אתי מבינה עברית חופשית, מחפשת בדירות אמיתיות, ומסבירה למה כל דירה
              מתאימה — עם נתוני סביבה אמיתיים: בתי ספר, פארקים, תחבורה ורעש.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <a
                href="#download"
                className="bg-primary hover:bg-primary-dark text-white rounded-full px-6 py-3.5 font-bold transition-colors"
              >
                לנסות את אתי באפליקציה
              </a>
              <a
                href="#services"
                className="border border-white/25 text-white rounded-full px-6 py-3.5 font-bold hover:bg-white/10 transition-colors"
              >
                איך זה עובד
              </a>
            </div>
          </div>

          {/* Visual side: mock chat card with real PropertyCard */}
          <div className="relative">
            <div className="bg-white/95 backdrop-blur-md rounded-[28px] p-5 card-shadow max-w-[400px] mx-auto rotate-[-2deg] flex flex-col gap-3.5 border border-white/20">
              <div className="bg-primary-light2 text-navy rounded-2xl rounded-br-md px-4 py-3 text-[14px] font-semibold self-end shadow-xs">
                משהו שקט ליד פארק, עד 7,500 ₪ 🙏
              </div>
              <div className="bg-cloud rounded-2xl rounded-bl-md px-4 py-3 text-[14px] text-navy self-start font-medium border border-slate-100">
                מצאתי 12 דירות. הנה 3 שממש שוות בדיקה — כולן במרחק הליכה מפארק 🌳
              </div>
              <div className="pointer-events-none select-none">
                <PropertyCard property={SAMPLE_ATI_PROPERTY} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
