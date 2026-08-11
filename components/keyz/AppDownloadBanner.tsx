import { Apple, Building } from "iconsax-react";

export default function AppDownloadBanner() {
  return (
    <section id="download" className="py-14">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="rounded-[36px] bg-primary-light2 border border-border-app p-10 md:p-14 grid md:grid-cols-2 items-center gap-8">
          {/* Text side */}
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-navy">
              הדירה הבאה שלכם כבר באפליקציה
            </h2>
            <p className="text-secondary-text mt-3">
              סוויפים, אתי, סיורי 360 והתאמות חכמות — הכול בחינם.
            </p>
            <div className="mt-7 flex gap-3 flex-wrap">
              <a
                href="https://apps.apple.com/il/app/id6773088152"
                target="_blank"
                rel="noopener"
                className="bg-navy text-white rounded-2xl px-5 py-3 flex items-center gap-2.5"
              >
                <Apple size={26} variant="Bold" color="currentColor" />
                <span className="flex flex-col leading-tight text-start">
                  <span className="text-[10px]">הורידו מ־</span>
                  <span className="text-[16px] font-bold">App Store</span>
                </span>
              </a>
              <span className="bg-white border border-border-app text-navy rounded-2xl px-5 py-3 flex items-center gap-2.5 opacity-70">
                <span className="flex flex-col leading-tight text-start">
                  <span className="text-[10px]">בקרוב ב־</span>
                  <span className="text-[16px] font-bold">Google Play</span>
                </span>
              </span>
            </div>
          </div>

          {/* Visual side: Ultra-realistic iPhone Mockup with real app screenshot */}
          <div className="relative mx-auto w-[250px] sm:w-[270px] transition-transform duration-300 hover:scale-[1.02]">
            {/* Ambient phone glow & shadow */}
            <div className="absolute -inset-2 rounded-[52px] bg-gradient-to-tr from-primary/35 via-sky-400/25 to-blue-600/35 blur-2xl opacity-80" />

            {/* iPhone Device Frame */}
            <div className="relative rounded-[46px] border-[9px] border-slate-900 bg-slate-900 shadow-[0_25px_60px_-15px_rgba(7,41,70,0.45)] overflow-hidden">
              {/* Dynamic Island Notch */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-4 w-20 bg-black rounded-full z-20 flex items-center justify-center pointer-events-none">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-900/90 ml-auto mr-1.5" />
              </div>

              {/* Real App Screenshot */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/swippage.png"
                alt="אפליקציית רנטלי - סוויפים"
                className="w-full h-auto object-cover rounded-[36px] block relative z-10"
              />

              {/* Glass sheen overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none z-20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
