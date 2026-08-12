import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הצהרת נגישות | Rently",
  description: "מחויבות Rently לנגישות האתר והאפליקציה לכלל המשתמשים.",
};

const sections: { heading: string; text: string }[] = [
  {
    heading: "המחויבות שלנו לנגישות",
    text: "אנו ב-Rently רואים בנגישות זכות בסיסית ומאמינים שחיפוש דירה צריך להיות פשוט ונוח לכל אדם, לרבות אנשים עם מוגבלות. אנו פועלים להנגשת האתר והאפליקציה בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע\"ג-2013, ובשאיפה לעמידה בתקן הישראלי ת\"י 5568 ברמה AA, המבוסס על הנחיות WCAG 2.1.",
  },
  {
    heading: "התאמות הנגישות שבוצעו",
    text: "בין ההתאמות שבוצעו באתר ובאפליקציה: תמיכה מלאה בכיווניות ימין-לשמאל ובשפה העברית, ניגודיות צבעים העומדת בדרישות התקן, גדלי טקסט קריאים ואפשרות הגדלה באמצעות הדפדפן והמכשיר, ניווט מלא באמצעות מקלדת, תיאורי טקסט חלופי (alt) לתמונות משמעותיות, מבנה כותרות היררכי ותגיות סמנטיות התומכות בקוראי מסך, ואזורי לחיצה מוגדלים בממשקי המגע.",
  },
  {
    heading: "חריגות וזמינות",
    text: "אנו משקיעים מאמצים שוטפים בשיפור הנגישות, אך ייתכן שחלקים מסוימים באתר — ובהם תוכן שהועלה על ידי משתמשים, כגון תמונות דירות וסיורי 360 — טרם הונגשו במלואם. אם נתקלתם ברכיב שאינו נגיש, נשמח לדעת ונפעל לתקנו בהקדם האפשרי.",
  },
  {
    heading: "דרכי פנייה לרכז הנגישות",
    text: "לכל שאלה, בקשה או דיווח על בעיית נגישות ניתן לפנות לרכז הנגישות שלנו בדוא\"ל accessibility@rently.co.il או דרך עמוד יצירת הקשר באתר. אנא ציינו את תיאור הבעיה, הדף שבו נתקלתם בה ואת הטכנולוגיה המסייעת שבה אתם משתמשים. אנו מתחייבים לטפל בפניות נגישות בתוך זמן סביר ולעדכן את הפונים בטיפול.",
  },
  {
    heading: "עדכון ההצהרה",
    text: "הצהרה זו נבדקת ומתעדכנת מעת לעת, בהתאם לשינויים באתר ובאפליקציה ולהתקדמות עבודות ההנגשה. תאריך העדכון האחרון מופיע בראש העמוד.",
  },
];

export default function AccessibilityStatementPage() {
  return (
    <main className="pt-28 pb-20 bg-slate-50/50">
      <div className="max-w-[800px] mx-auto px-6 bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100">
        <h1 className="text-3xl sm:text-4xl font-black text-navy tracking-tight">הצהרת נגישות</h1>
        <p className="text-[13.5px] font-semibold text-secondary-text mt-2 border-b border-slate-100 pb-4">
          מחויבות Rently לנגישות ושיוון זכויות במרחב הדיגיטלי · עודכן לאחרונה: אוגוסט 2026
        </p>
        <div className="mt-6 space-y-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-extrabold text-navy mb-2.5">
                {s.heading}
              </h2>
              <p className="text-[14.5px] leading-relaxed text-slate-700 font-normal">
                {s.text}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
