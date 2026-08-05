import type { Metadata } from "next";
import { MagicStar, Eye, People, Flash } from "iconsax-react";

export const metadata: Metadata = {
  title: "עלינו | Rently",
  description: "הסיפור של Rently — למה החלטנו להפוך את חיפוש הדירה לחוויה כיפית, הוגנת וחכמה.",
};

const values = [
  {
    icon: MagicStar,
    title: "חדשנות",
    desc: "AI אמיתי שעובד בשבילכם — לא באזוורדים, אלא כלים שחוסכים זמן כל יום.",
  },
  {
    icon: Eye,
    title: "שקיפות",
    desc: "מה שרואים זה מה שמקבלים. בלי מודעות פיקטיביות ובלי הפתעות בסיור.",
  },
  {
    icon: People,
    title: "קהילה",
    desc: "שוכרים, בעלי דירות ומתווכים — כולם מרוויחים כשההתאמה נכונה.",
  },
  {
    icon: Flash,
    title: "פשטות",
    desc: "כל מה שמסובך בשוק הדיור — אנחנו הופכים לכמה הקלקות פשוטות.",
  },
];

export default function AboutPage() {
  return (
    <main className="pt-28 pb-20">
      <div className="max-w-[760px] mx-auto px-4">
        <h1 className="text-3xl md:text-5xl font-black text-navy leading-tight">
          הסיפור של Rently
        </h1>

        <div className="mt-6 space-y-4">
          <p className="text-[16px] leading-relaxed text-navy/90">
            כמו רוב האנשים בישראל, גם אנחנו חיפשנו דירה. גללנו מאות מודעות
            זהות, התקשרנו למספרים שלא ענו, והגענו לדירות שנראו אחרת לגמרי
            מהתמונות. איפשהו בין הסיור העשירי לטופס המאה, הבנו שזה לא חייב
            להיות ככה — ושטכנולוגיה טובה יכולה להפוך את אחת ההחלטות הגדולות
            בחיים לחוויה שדווקא נעים לעבור.
          </p>
          <p className="text-[16px] leading-relaxed text-navy/90">
            כך נולדה Rently: אפליקציה שמכירה אתכם באמת. אתי, העוזרת החכמה
            שלנו, מקשיבה למה שחשוב לכם — תקציב, שכונה, אור טבעי, מרחק
            מהעבודה — ומביאה רק דירות שרלוונטיות אליכם. סיורי 360 מאפשרים
            להסתובב בדירה מהספה, וחוזה דיגיטלי חתום סוגר את העסקה בלי
            להדפיס אפילו דף אחד.
          </p>
          <p className="text-[16px] leading-relaxed text-navy/90">
            אבל הכי חשוב לנו זו ההגינות. שוק הדיור מלא באי־ודאות, ואנחנו
            מאמינים ששני הצדדים — מי שמחפש בית ומי שמציע אותו — מגיע להם
            תהליך שקוף, מהיר ואנושי. זה מה שאנחנו בונים כאן, דירה אחת בכל
            פעם.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
          {values.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white border border-border-app rounded-3xl p-5 card-shadow"
            >
              <div className="w-11 h-11 rounded-2xl bg-primary-light2 flex items-center justify-center">
                <Icon size={22} color="#2563EB" variant="Bold" />
              </div>
              <h3 className="font-black text-navy mt-3.5">{title}</h3>
              <p className="text-secondary-text text-[14px] leading-relaxed mt-1">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
