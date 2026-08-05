"use client";

import { useState } from "react";
import { ArrowDown2 } from "iconsax-react";

const faqs = [
  {
    q: "האם רנטלי בחינם?",
    a: "כן. חיפוש דירות, הצ'אט עם אתי, סיורי 360 ופרסום של עד 3 נכסים — הכל בחינם. בעלי דירות עם יותר נכסים ומתווכים שרוצים כלים מקצועיים יכולים לשדרג לחבילה מתקדמת בתוך האפליקציה.",
  },
  {
    q: "איך אתי מוצאת לי דירות?",
    a: "מספרים לאתי בשפה חופשית מה אתם מחפשים — תקציב, אזור, מה חשוב לכם בסביבה — והיא סורקת את כל הדירות הפעילות ומדרגת אותן לפי מידת ההתאמה אליכם. ככל שתספרו לה יותר, ההמלצות שלה יהיו מדויקות יותר.",
  },
  {
    q: "מה זה סיור 360?",
    a: "סיור וירטואלי שמאפשר להסתובב בתוך הדירה מהטלפון, כאילו אתם שם. בעלי דירות מצלמים אותו ישירות מהאפליקציה בכמה דקות, ושוכרים חוסכים נסיעות לדירות שלא מתאימות — רואים הכל מראש.",
  },
  {
    q: "איך מפרסמים דירה?",
    a: "מורידים את האפליקציה, מעלים כמה תמונות, ועזרא — העוזר החכם לבעלי דירות — מנסח עבורכם תיאור מקצועי. תוך דקות המודעה באוויר ומוצגת לשוכרים שמתאימים לה באמת.",
  },
  {
    q: "האם הדירות מאומתות?",
    a: "אנחנו עושים הרבה כדי שתראו רק מודעות אמיתיות: כל מפרסם מזוהה עם חשבון אישי, המערכת מסננת תוכן חשוד, ומודעות שמדווחות נבדקות ומוסרות. אם משהו נראה לכם לא תקין — דווחו לנו והצוות יטפל.",
  },
  {
    q: "איך עובד החוזה הדיגיטלי?",
    a: "כששני הצדדים מוכנים לסגור, אפשר לחתום על חוזה שכירות דיגיטלי ישירות באפליקציה. החתימה מוצפנת וחסינה לשינויים — כל צד מקבל עותק, וכל ניסיון לערוך את המסמך אחרי החתימה מזוהה מיד.",
  },
  {
    q: "מה מקבלים מתווכים?",
    a: "חשבון מתווך כולל סט כלים מקצועי: ניהול לקוחות (CRM), פרסום מרובה נכסים, מיתוג אישי על המודעות, ניתוחי שוק והשוואת מחירים, והתאמה אוטומטית בין הנכסים שלכם ללקוחות שמחפשים.",
  },
  {
    q: "איך יוצרים איתכם קשר?",
    a: "כותבים לנו למייל support@rently.co.il או דרך עמוד צור קשר באתר. אנחנו זמינים בימים א׳–ה׳ בין 9:00 ל־18:00, ומשתדלים לחזור לכל פנייה תוך יום עסקים.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <main className="pt-28 pb-20">
      <div className="max-w-[760px] mx-auto px-4">
        <h1 className="text-3xl md:text-5xl font-black text-navy leading-tight">
          שאלות נפוצות
        </h1>
        <p className="text-secondary-text text-lg mt-3">
          כל מה שרציתם לדעת על Rently — במקום אחד.
        </p>

        <div className="mt-10 space-y-3">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="bg-white border border-border-app rounded-2xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex justify-between items-center p-5 text-start font-bold text-navy text-[15px] gap-3"
                >
                  <span>{item.q}</span>
                  <ArrowDown2
                    size={18}
                    color="#5B7A99"
                    className={`shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-[14px] text-secondary-text leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
