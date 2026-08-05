import type { Metadata } from "next";
import { House, Briefcase, TickCircle } from "iconsax-react";

export const metadata: Metadata = {
  title: "פרסום דירה | Rently",
  description: "מפרסמים דירה ב־Rently בחינם — מעלים תמונות, עזרא מנסח, ומקבלים פניות מתאימות תוך דקות.",
};

const APP_STORE = "https://apps.apple.com/il/app/id6773088152";

const steps = [
  {
    num: "1",
    title: "מצלמים ומעלים",
    desc: "כמה תמונות טובות מהטלפון — זה כל מה שצריך כדי להתחיל. אפשר להוסיף גם סיור 360 מרשים.",
  },
  {
    num: "2",
    title: "עזרא מנסח לכם",
    desc: "העוזר החכם שלנו כותב תיאור מקצועי ומדויק לדירה, ואתם רק מאשרים. בלי להתלבט על ניסוחים.",
  },
  {
    num: "3",
    title: "מקבלים פניות מתאימות",
    desc: "האלגוריתם מציג את הדירה לשוכרים שבאמת מתאימים לה — פחות רעש, יותר פגישות רציניות.",
  },
];

const landlordBullets = [
  "פרסום חינם עד 3 נכסים",
  "ניהול פניות וצ'אט",
  "יומן ביקורים חכם",
];

const agentBullets = [
  "כלים מקצועיים ו־CRM",
  "מיתוג אישי",
  "פרסום מרובה נכסים",
];

export default function PublishPage() {
  return (
    <main className="pt-28 pb-20">
      <div className="max-w-[1200px] mx-auto px-4">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-3xl md:text-5xl font-black text-navy leading-tight">
            מפרסמים דירה ב־Rently — בחינם
          </h1>
          <p className="text-secondary-text text-lg mt-3 max-w-[560px] mx-auto">
            מעלים תמונות, עזרא העוזר החכם עוזר לנסח, והדירה מול אלפי שוכרים תוך
            דקות
          </p>
          <a
            href={APP_STORE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary hover:bg-primary-dark transition-colors rounded-full px-7 py-3.5 text-white font-bold mt-7 badge-shadow"
          >
            להורדת האפליקציה ופרסום
          </a>
        </section>

        {/* 3 steps */}
        <section className="grid md:grid-cols-3 gap-4 mt-12">
          {steps.map((s) => (
            <div
              key={s.num}
              className="bg-white rounded-3xl border border-border-app p-6 card-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-primary-light2 text-primary font-black flex items-center justify-center text-lg">
                {s.num}
              </div>
              <h3 className="font-black text-navy text-lg mt-4">{s.title}</h3>
              <p className="text-secondary-text text-[14px] leading-relaxed mt-1.5">
                {s.desc}
              </p>
            </div>
          ))}
        </section>

        {/* Audiences */}
        <section className="grid md:grid-cols-2 gap-4 mt-10">
          {/* Landlords */}
          <div className="bg-white rounded-3xl border border-border-app p-7 card-shadow flex flex-col">
            <div className="w-11 h-11 rounded-2xl bg-primary-light2 flex items-center justify-center">
              <House size={24} color="#2563EB" variant="Bold" />
            </div>
            <h2 className="font-black text-navy text-xl mt-4">בעלי דירות</h2>
            <ul className="mt-4 space-y-2.5 flex-1">
              {landlordBullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5">
                  <TickCircle size={18} color="#27AE60" variant="Bold" className="shrink-0" />
                  <span className="text-navy/90 text-[15px]">{b}</span>
                </li>
              ))}
            </ul>
            <a
              href={APP_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-center bg-primary hover:bg-primary-dark transition-colors rounded-full px-7 py-3.5 text-white font-bold mt-6"
            >
              לפרסום הדירה הראשונה
            </a>
          </div>

          {/* Agents */}
          <div className="bg-navy-deep text-white rounded-3xl p-7 card-shadow flex flex-col">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
              <Briefcase size={24} color="#FFFFFF" variant="Bold" />
            </div>
            <h2 className="font-black text-xl mt-4">מתווכים</h2>
            <ul className="mt-4 space-y-2.5 flex-1">
              {agentBullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5">
                  <TickCircle size={18} color="#27AE60" variant="Bold" className="shrink-0" />
                  <span className="text-white/90 text-[15px]">{b}</span>
                </li>
              ))}
            </ul>
            <a
              href={APP_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-center bg-white hover:bg-primary-light2 transition-colors rounded-full px-7 py-3.5 text-navy font-bold mt-6"
            >
              להצטרפות כמתווכים
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
