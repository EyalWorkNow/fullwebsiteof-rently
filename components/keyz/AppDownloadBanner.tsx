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

          {/* Visual side: phone mock */}
          <div className="rounded-[44px] bg-navy p-3 w-[240px] mx-auto shadow-2xl">
            <div className="rounded-[34px] bg-white overflow-hidden aspect-[9/19] p-4 flex flex-col gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/rently_logo_full.svg"
                alt="Rently"
                className="h-6 w-auto mx-auto mt-1"
              />
              <div className="rounded-2xl bg-primary-light2 aspect-[1.6] w-full flex items-center justify-center text-primary">
                <Building size={40} variant="Bulk" color="currentColor" />
              </div>
              <div className="bg-cloud rounded-full h-3 w-3/4" />
              <div className="bg-cloud rounded-full h-3 w-1/2" />
              <div className="bg-primary rounded-full h-9 w-full mt-auto mb-1 flex items-center justify-center text-white text-[12px] font-bold">
                הצג דירות
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
