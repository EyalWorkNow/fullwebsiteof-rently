import { MagicStar, Building } from "iconsax-react";

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

          {/* Visual side: mock chat card */}
          <div className="relative">
            <div className="bg-white rounded-[28px] p-5 card-shadow max-w-[380px] mx-auto rotate-[-2deg] flex flex-col gap-3">
              <div className="bg-primary-light2 text-navy rounded-2xl rounded-br-md px-4 py-3 text-[14px] font-semibold self-end">
                משהו שקט ליד פארק, עד 7,500 ₪ 🙏
              </div>
              <div className="bg-cloud rounded-2xl rounded-bl-md px-4 py-3 text-[14px] text-navy self-start">
                מצאתי 12 דירות. הנה 3 שממש שוות בדיקה — כולן במרחק הליכה מפארק 🌳
              </div>
              <div className="flex gap-3 items-center border border-border-app rounded-2xl p-3">
                <div className="w-14 h-14 shrink-0 rounded-xl bg-primary-light2 flex items-center justify-center text-primary">
                  <Building size={28} variant="Bulk" color="currentColor" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-black text-navy">
                    רחוב הירקון 12
                  </span>
                  <span className="text-[12px] text-secondary-text">
                    תל אביב · 3 חד׳ · 78 מ״ר
                  </span>
                </div>
                <span className="text-[14px] font-black text-navy ms-auto">
                  ₪7,200
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
