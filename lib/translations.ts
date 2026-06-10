export type Lang = "he" | "en" | "ar" | "fr" | "es";
export type Dir  = "rtl" | "ltr";

export const langDir: Record<Lang, Dir> = { he: "rtl", ar: "rtl", en: "ltr", fr: "ltr", es: "ltr" };

export const langMeta: Record<Lang, { flag: string; label: string }> = {
  he: { flag: "🇮🇱", label: "עברית"    },
  en: { flag: "🇺🇸", label: "English"  },
  ar: { flag: "🇸🇦", label: "العربية"  },
  fr: { flag: "🇫🇷", label: "Français" },
  es: { flag: "🇪🇸", label: "Español"  },
};

// ─── Hebrew ───────────────────────────────────────────────────────────────────
const he = {
  nav: {
    problem: "בעיה", how: "איך זה עובד", features: "תכונות",
    solution: "פתרון", audiences: "לכולם", cta: "הצטרפו",
  },
  hero: {
    badge: "PropTech • ישראל 2025",
    h1a: "מצא דירה", h1b: "כמו שאתה", h1c: "בוחר הכל",
    sub: "פחות גלילה. יותר התאמה. יותר אמון.\nהדרך החדשה למצוא דירה בישראל.",
    s1sub: "הורד מה-", s1: "App Store", s2sub: "הורד מ-", s2: "Google Play",
    trust: "+500 דיירים מצאו בית דרך Rently",
  },
  stats: { items: ["דירות פעילות", "משתמשים פעילים", "דירוג App Store", "סיורים וירטואליים"] },
  problem: {
    badge: "הבעיה בשוק", h2a: "למה חיפוש דירה בישראל", h2b: "מרגיש כמו מטלה?",
    sub: "הכלים שקיימים היום לא נבנו עבורכם. הם נבנו לפני 20 שנה.", outro: "הפתרון שלנו",
    pains: [
      { stat: "1,200+", statLabel: "מודעות ביד2", title: "אלפי תוצאות, מעט רלוונטיות", body: "מנוע חיפוש ישן שמציף הכל — ללא סינון חכם, ללא התאמה אישית, ללא עדיפות לדירות שמתאימות לכם." },
      { stat: "60%",    statLabel: "מהתמונות",    title: "תמונות שלא מייצגות את המציאות", body: "מודעות עם תמונות ישנות, שקריות או ממוחזרות. אתם מגיעים לדירה ומגלים משהו שונה לחלוטין." },
      { stat: "3–6",    statLabel: "שבועות חיפוש",title: "תהליך ממושך ומתיש", body: "ממוצע החיפוש בישראל עומד על שלושה עד שישה שבועות. ימים שלמים של גלילה, התקשרות, ואכזבות." },
    ],
  },
  how: {
    badge: "איך זה עובד", h2: "שלושה שלבים לדירה הבאה", sub: "פשוט, מהיר, ובלי כאב ראש",
    steps: [
      { title: "מגדירים מה מחפשים", body: "בוחרים אזור, תקציב, מספר חדרים ומאפיינים נוספים. הפילטרים שלנו חוסכים גלילה אינסופית ומתאמים לכם רק את מה שרלוונטי." },
      { title: "גולשים ומחליקים",    body: "כל דירה מוצגת בכרטיסייה עם תמונות, מחיר, מיקום ואחוז ההתאמה האישי שלכם. ימינה = אוהב, שמאלה = לא בשבילי." },
      { title: "יוצרים קשר ישירות", body: "כשמצאתם דירה מעניינת — פותחים צ׳אט ישיר עם בעל הדירה. קובעים ביקור, שואלים שאלות, מקדמים. בלי מתווכים." },
    ],
    stepLabel: "שלב",
  },
  showcase: {
    badge: "תצוגת המסכים", h2: "שני צדדים. חוויה אחת.",
    sub: "האפליקציה בנויה לשוכרים ולבעלי דירות — כל אחד עם ממשק ייחודי",
    tenantBtn: "🏠  שוכרים וקונים", landlordBtn: "🏢  בעלי דירות",
    tenantLabel: "שוכר", landlordLabel: "בעל דירה",
    tenantScreens: [
      { title: "דפדוף בסוויפ",    desc: "מחליקים ימינה לאהוב, שמאלה לדחות — כולל 3D ואחוז התאמה." },
      { title: "תצוגת גריד",       desc: "תצוגה קלאסית עם פילטרים חכמים לכל סוגי החיפוש." },
      { title: "סינון מדויק",      desc: "מחיר, שטח, קומה, מאפיינים — מגדירים פעם אחת." },
      { title: "חיפוש על מפה",     desc: "מוצאים דירות על מפה חיה עם פרטים מיידיים." },
      { title: "פרופיל נכס",       desc: "תמונות, מחיר, מיקום, מאפיינים — כל הנתונים במקום אחד." },
      { title: "ההתאמות שלי",      desc: "כל הדירות שאהבתם — מוכנות לפעולה." },
      { title: "צ׳אט ישיר",        desc: "שיחה ישירה עם בעל הדירה — בלי מתווכים." },
      { title: "הפרופיל שלי",      desc: "ניהול העדפות, סטטיסטיקות ואחוז ההתאמה שלך." },
    ],
    landlordScreens: [
      { title: "דשבורד ביצועים",    desc: "הכנסה חודשית, אחוז תפוסה, נכסים פעילים — הכל בזמן אמת." },
      { title: "אנליטיקות שבועיות", desc: "36 פניות השבוע, ממוצע יומי, פעולות מהירות — מעקב חי." },
      { title: "פעילות אחרונה",     desc: "שיחות לטיפול, ההתאמות הכי חמות, הנכסים שלי בסקירה." },
      { title: "הדירות שלי",        desc: "כל הנכסים עם מחיר, מיקום ומצב — ניהול מלא ממקום אחד." },
      { title: "פרופיל הנכס",       desc: "כך השוכרים רואים את הדירה שלך — עם תמונות ופרטים." },
      { title: "פרופיל שוכר",       desc: "שוכר שהתאים לנכס שלך — פרטים, תקציב, העדפות, פעולות." },
      { title: "פרטי נכס מורחבים",  desc: "כל המידע הטכני, תמונות, מיקום ואפשרויות ניהול." },
      { title: "הפרופיל שלי",       desc: "ניהול החשבון, אימות, ופרופיל בעל הדירה." },
    ],
  },
  audiences: {
    badge: "למי Rently מיועדת?", h2: "לכולם. בהתאמה לכל אחד.",
    sub: "בין אם אתם מחפשים, משכירים או מתווכים — Rently בנויה עבורכם",
    cta: "התחל בחינם", featured: "הכי פופולרי",
    cards: [
      { title: "שוכרים וקונים",  tagline: "מצאו את הבית שלכם מהר יותר", bullets: ["סוויפ מהיר בין מאות דירות", "אחוז התאמה אישי לכל מודעה", "סיור 3D לפני שמגיעים פיזית", "צ׳אט ישיר עם בעל הדירה", "מפה חיה לחיפוש לפי אזור"] },
      { title: "משכירים ומוכרים", tagline: "מצאו שוכר ברצינות, בלי מתווך", bullets: ["העלאת מודעה תוך דקות", "אימות תמונות לבניית אמון", "סריקת 3D לדירה עם הנייד שלכם", "קבלת פניות מדיירים רציניים בלבד", "אנליטיקות: צפיות, לייקים, פניות"] },
      { title: "מתווכים",         tagline: "נהלו נכסים בקנה מידה גדול",  bullets: ["פרופיל עסקי עם תג מתווך", "ניהול מרובה נכסים ממקום אחד", "CRM לניהול לידים ופניות", "קידום ממומן לנכסים פרימיום", "ניתוח נתוני שוק בזמן אמת"] },
    ],
  },
  landlords: {
    badge: "לבעלי דירות", h2a: "תנהלו את הנכסים שלכם", h2b: "כמו מקצוענים",
    sub: "דשבורד מלא, שוכרים מאומתים, ואנליטיקות — כל מה שצריך כדי להשכיר מהר יותר ובמחיר טוב יותר",
    screens: [
      { stat: "₪28,000", statLabel: "הכנסה חודשית", title: "דשבורד ניהול",       desc: "סקירת הכנסות, תפוסה, ונכסים פעילים — הכל בזמן אמת." },
      { stat: "36",       statLabel: "פניות השבוע",  title: "אנליטיקות שוטפות",   desc: "מעקב אחר צפיות, פניות וביצועי הנכסים שלך על ציר הזמן." },
      { stat: "4",        statLabel: "נכסים פעילים", title: "ניהול מודעות",        desc: "כל הנכסים שלך עם מחיר, מיקום ומצב תפוסה — עדכון בלחיצה." },
      { stat: "94%",      statLabel: "אחוז התאמה",   title: "פרופילי שוכרים",      desc: "תראו מי מתעניין — פרטים, תקציב, והעדפות שוכר בקרטייה אחת." },
    ],
    perks: ["אנליטיקות בזמן אמת", "ניהול מרובה נכסים", "צ׳אט ישיר עם שוכרים", "אימות מלא ואמינות", "ניהול הכנסות"],
    testimonial: { quote: "השכרתי דירה תוך 4 ימים — הדשבורד הראה לי שנכנסו 18 שוכרים פוטנציאליים ביממה הראשונה. לא האמנתי.", name: "דוד ל.", role: "בעל 3 נכסים, תל אביב" },
    formTitle: "רוצים גישה מוקדמת?", formSub: "השאירו פרטים ונחזור אליכם ראשונים",
    trust: "ללא עמלות • ביטול בכל עת • השקה ב-2025",
  },
  testimonials: {
    badge: "מה אומרים הדיירים", h2: "אמיתי. מדיירים אמיתיים.",
    sub: "+500 דיירים כבר מצאו בית דרך Rently — זה מה שהם אומרים",
    reviews: [
      { name: "נועם כ.", role: "דייר | תל אביב",   text: "חיפשתי דירה חצי שנה בכל האתרים הישנים ולא מצאתי כלום. עם Rently מצאתי דירה תוך שבועיים. האפליקציה פשוט שונה.", avatar: "נ" },
      { name: "מיה ר.",  role: "דיירת | רמת גן",   text: "אהבתי שיכולתי לראות את הדירה בסיור תלת-מימד לפני שביקרתי. חסך לי הרבה זמן וגיליתי שהדירה בדיוק מה שחלמתי עליה.", avatar: "מ" },
      { name: "אורי ל.", role: "דייר | הרצליה",    text: "הצ׳אט הישיר עם בעל הדירה הוא game changer. ענו לי תוך דקות, קבענו ביקור למחרת. אין מתווך, אין עמלות.", avatar: "א" },
      { name: "שירה ב.", role: "דיירת | ירושלים",  text: "הפילטרים של Rently הם הדבר הטוב ביותר שיש — הגדרתי חיית מחמד מותרת + מרפסת + קרוב לרכבת ורק דירות כאלה קיבלתי.", avatar: "ש" },
    ],
  },
  download: {
    badge: "הורדה בחינם", h2a: "הדירה הבאה שלך", h2b: "מחכה לסוויפ",
    sub: "הורידו את Rently עכשיו ותתחילו לגלוש בין דירות — בחינם לגמרי, בלי מתווכים, בלי עמלות.",
    s1sub: "הורד מה-", s1: "App Store", s2sub: "הורד מ-", s2: "Google Play",
    t1: "4.8 ב-App Store", t2: "+500 דיירים מצאו בית", t3: "148 דירות פעילות",
    divider: "לא רוצים לחכות לחנות?",
    formTitle: "קבל גישה ראשונה ל-Rently", formSub: "נשלח לכם הזמנה כשהאפליקציה תהיה מוכנה",
  },
  form: {
    roles: ["שוכר / קונה", "בעל דירה / מוכר", "מתווך"],
    namePH: "שם מלא", emailPH: "כתובת מייל", phonePH: "מספר טלפון (אופציונלי)",
    submit: "הצטרפו לרשימת ההמתנה", loading: "שולח...",
    successTitle: "קיבלנו! תודה 🎉", successSub: "ניצור קשר בקרוב עם גישה ראשונה ל-Rently",
    error: "משהו השתבש — נסה שוב", disclaimer: "ללא עמלות. ביטול בכל עת.",
  },
  footer: {
    tagline: "Rently מביאה חוויית סוויפ מוכרת לחיפוש דירות — מהירה, כיפית ובלי עמלות.",
    col1: "האפליקציה", col2: "תמיכה",
    col1links: ["תכונות", "מסכי האפליקציה", "איך זה עובד", "לבעלי דירות"],
    col2links: ["שאלות נפוצות", "צור קשר", "מדיניות פרטיות", "תנאי שימוש"],
    copy: "כל הזכויות שמורות.", madeIn: "נבנה עם ❤️ בישראל",
  },
};

// ─── English ──────────────────────────────────────────────────────────────────
const en: typeof he = {
  nav: {
    problem: "Problem", how: "How It Works", features: "Features",
    solution: "Solution", audiences: "For You", cta: "Join Now",
  },
  hero: {
    badge: "PropTech • Israel 2025",
    h1a: "Find Your", h1b: "Home the Way", h1c: "You Choose",
    sub: "Less scrolling. Better matches. More trust.\nThe new way to find an apartment.",
    s1sub: "Download on the", s1: "App Store", s2sub: "Get it on", s2: "Google Play",
    trust: "+500 tenants found their home via Rently",
  },
  stats: { items: ["Active Listings", "Active Users", "App Store Rating", "Virtual Tours"] },
  problem: {
    badge: "The Problem", h2a: "Why is finding an apartment", h2b: "such a nightmare?",
    sub: "The tools that exist today weren't built for you. They were built 20 years ago.", outro: "Our Solution",
    pains: [
      { stat: "1,200+", statLabel: "listings on Yad2", title: "Thousands of results, few relevant", body: "An old search engine that floods you with everything — no smart filtering, no personalization, no priority for apartments that actually fit you." },
      { stat: "60%",    statLabel: "of photos",        title: "Photos that don't reflect reality",  body: "Listings with old, misleading or recycled photos. You arrive at the apartment and find something completely different." },
      { stat: "3–6",    statLabel: "weeks searching",  title: "A long and exhausting process",      body: "The average apartment search in Israel takes 3 to 6 weeks. Whole days of scrolling, calling, and disappointments." },
    ],
  },
  how: {
    badge: "How It Works", h2: "Three steps to your next home", sub: "Simple, fast, and stress-free",
    steps: [
      { title: "Set your preferences", body: "Choose area, budget, number of rooms and more. Our filters save endless scrolling and only show you what's actually relevant." },
      { title: "Swipe & browse",        body: "Each apartment is shown as a card with photos, price, location and your personal match score. Right = love it, Left = not for me." },
      { title: "Connect directly",      body: "Found something interesting? Open a direct chat with the landlord. Schedule a visit, ask questions, move forward. No agents." },
    ],
    stepLabel: "Step",
  },
  showcase: {
    badge: "App Screens", h2: "Two sides. One experience.",
    sub: "Built for both tenants and landlords — each with a unique interface",
    tenantBtn: "🏠  Tenants & Buyers", landlordBtn: "🏢  Landlords",
    tenantLabel: "Tenant", landlordLabel: "Landlord",
    tenantScreens: [
      { title: "Swipe to Browse",    desc: "Swipe right to like, left to pass — with 3D tour and match score." },
      { title: "Grid View",          desc: "Classic view with smart filters for all search types." },
      { title: "Smart Filters",      desc: "Price, size, floor, amenities — set once, search forever." },
      { title: "Map Search",         desc: "Find apartments on a live map with instant details." },
      { title: "Property Profile",   desc: "Photos, price, location, features — all data in one place." },
      { title: "My Matches",         desc: "All the apartments you liked — ready to act on." },
      { title: "Direct Chat",        desc: "Talk directly with the landlord — no middlemen." },
      { title: "My Profile",         desc: "Manage preferences, statistics, and your match score." },
    ],
    landlordScreens: [
      { title: "Performance Dashboard", desc: "Monthly income, occupancy rate, active properties — all real-time." },
      { title: "Weekly Analytics",      desc: "36 inquiries this week, daily average, quick actions — live tracking." },
      { title: "Recent Activity",       desc: "Conversations to handle, hottest matches, my listings overview." },
      { title: "My Listings",           desc: "All properties with price, location and status — full management." },
      { title: "Property Profile",      desc: "How tenants see your apartment — with photos and details." },
      { title: "Tenant Profile",        desc: "A tenant matched to your property — details, budget, preferences." },
      { title: "Extended Property",     desc: "All technical info, photos, location and management options." },
      { title: "My Profile",            desc: "Account management, verification and landlord profile." },
    ],
  },
  audiences: {
    badge: "Who is Rently for?", h2: "For everyone. Tailored to each.",
    sub: "Whether you're searching, renting or brokering — Rently is built for you",
    cta: "Start Free", featured: "Most Popular",
    cards: [
      { title: "Tenants & Buyers",   tagline: "Find your home faster",          bullets: ["Quick swipe through hundreds of apartments", "Personal match score for each listing", "3D tour before visiting in person", "Direct chat with landlord", "Live map search by area"] },
      { title: "Landlords & Sellers",tagline: "Find serious tenants, no agent", bullets: ["Post a listing in minutes", "Photo verification for trust", "3D scan with your phone", "Receive inquiries from serious tenants only", "Analytics: views, likes, inquiries"] },
      { title: "Agents & Brokers",   tagline: "Manage properties at scale",     bullets: ["Business profile with agent badge", "Manage multiple properties in one place", "CRM for lead and inquiry management", "Paid promotion for premium properties", "Real-time market data analysis"] },
    ],
  },
  landlords: {
    badge: "For Landlords", h2a: "Manage your properties", h2b: "like a professional",
    sub: "Full dashboard, verified tenants, and analytics — everything you need to rent faster and at a better price",
    screens: [
      { stat: "₪28,000", statLabel: "monthly income",  title: "Management Dashboard",   desc: "Revenue overview, occupancy, and active properties — all real-time." },
      { stat: "36",       statLabel: "inquiries/week",  title: "Ongoing Analytics",       desc: "Track views, inquiries and property performance on a timeline." },
      { stat: "4",        statLabel: "active listings", title: "Listing Management",       desc: "All your properties with price, location and status — one-click update." },
      { stat: "94%",      statLabel: "match score",     title: "Tenant Profiles",          desc: "See who's interested — details, budget, preferences all in one card." },
    ],
    perks: ["Real-time Analytics", "Multi-property Management", "Direct Tenant Chat", "Full Verification", "Income Tracking"],
    testimonial: { quote: "I rented out my apartment in 4 days — the dashboard showed me 18 potential tenants in the first day. Couldn't believe it.", name: "David L.", role: "Owner of 3 properties, Tel Aviv" },
    formTitle: "Want early access?", formSub: "Leave your details and we'll get back to you first",
    trust: "No fees • Cancel anytime • Launching 2025",
  },
  testimonials: {
    badge: "What Tenants Say", h2: "Real. From real tenants.",
    sub: "+500 tenants have already found a home via Rently — here's what they say",
    reviews: [
      { name: "Noam K.", role: "Tenant | Tel Aviv",    text: "I searched for 6 months on all the old sites and found nothing. With Rently I found an apartment in two weeks. The app is just different.", avatar: "N" },
      { name: "Mia R.",  role: "Tenant | Ramat Gan",   text: "I loved being able to see the apartment in 3D before visiting. It saved me so much time and I found out it was exactly what I dreamed of.", avatar: "M" },
      { name: "Uri L.",  role: "Tenant | Herzliya",    text: "Direct chat with the landlord is a game changer. They replied in minutes, we scheduled a visit the next day. No agent, no fees.", avatar: "U" },
      { name: "Shira B.",role: "Tenant | Jerusalem",   text: "Rently's filters are the best thing ever — I set pets allowed + balcony + near train and only apartments like that showed up.", avatar: "S" },
    ],
  },
  download: {
    badge: "Free Download", h2a: "Your next apartment", h2b: "is waiting for a swipe",
    sub: "Download Rently now and start browsing apartments — completely free, no agents, no fees.",
    s1sub: "Download on the", s1: "App Store", s2sub: "Get it on", s2: "Google Play",
    t1: "4.8 on App Store", t2: "+500 tenants found home", t3: "148 active listings",
    divider: "Don't want to wait for the app store?",
    formTitle: "Get early access to Rently", formSub: "We'll send you an invite when the app is ready",
  },
  form: {
    roles: ["Tenant / Buyer", "Landlord / Seller", "Agent"],
    namePH: "Full name", emailPH: "Email address", phonePH: "Phone number (optional)",
    submit: "Join the Waitlist", loading: "Sending...",
    successTitle: "Got it! Thanks 🎉", successSub: "We'll be in touch soon with early access to Rently",
    error: "Something went wrong — please try again", disclaimer: "No fees. Cancel anytime.",
  },
  footer: {
    tagline: "Rently brings the familiar swipe experience to apartment hunting — fast, fun and fee-free.",
    col1: "App", col2: "Support",
    col1links: ["Features", "App Screens", "How It Works", "For Landlords"],
    col2links: ["FAQ", "Contact Us", "Privacy Policy", "Terms of Use"],
    copy: "All rights reserved.", madeIn: "Made with ❤️ in Israel",
  },
};

// ─── Arabic ───────────────────────────────────────────────────────────────────
const ar: typeof he = {
  nav: {
    problem: "المشكلة", how: "كيف يعمل", features: "المميزات",
    solution: "الحل", audiences: "للجميع", cta: "انضم الآن",
  },
  hero: {
    badge: "PropTech • إسرائيل 2025",
    h1a: "اعثر على", h1b: "شقتك بالطريقة", h1c: "التي تختارها",
    sub: "تصفح أقل. توافق أفضل. ثقة أكبر.\nالطريقة الجديدة للعثور على شقة.",
    s1sub: "حمّل من", s1: "App Store", s2sub: "احصل عليه من", s2: "Google Play",
    trust: "+500 مستأجر وجد منزله عبر Rently",
  },
  stats: { items: ["إعلانات نشطة", "مستخدمون نشطون", "تقييم App Store", "جولات افتراضية"] },
  problem: {
    badge: "المشكلة", h2a: "لماذا إيجاد شقة", h2b: "أمر مرهق جداً؟",
    sub: "الأدوات الموجودة اليوم لم تُبنَ لك. بُنيت قبل 20 عاماً.", outro: "الحل لدينا",
    pains: [
      { stat: "1,200+", statLabel: "إعلان في يد2",    title: "آلاف النتائج، قليل منها مناسب",    body: "محرك بحث قديم يعرض كل شيء — دون تصفية ذكية، دون تخصيص، دون أولوية للشقق المناسبة لك." },
      { stat: "60%",    statLabel: "من الصور",         title: "صور لا تعكس الواقع",               body: "إعلانات بصور قديمة أو مضللة أو معاد استخدامها. تصل إلى الشقة لتجد شيئاً مختلفاً تماماً." },
      { stat: "3–6",    statLabel: "أسابيع من البحث", title: "عملية مطولة ومرهقة",              body: "متوسط البحث عن شقة يستغرق 3 إلى 6 أسابيع. أيام كاملة من التصفح والاتصال وخيبات الأمل." },
    ],
  },
  how: {
    badge: "كيف يعمل", h2: "ثلاث خطوات لشقتك القادمة", sub: "بسيط وسريع وبدون صداع",
    steps: [
      { title: "حدّد ما تبحث عنه", body: "اختر المنطقة والميزانية وعدد الغرف والمواصفات. مرشحاتنا توفر عليك التمرير اللانهائي وتعرض لك فقط ما يناسبك." },
      { title: "تصفح وامسح",         body: "تُعرض كل شقة في بطاقة مع صور وسعر وموقع ونسبة توافقك الشخصية. يميناً = أحبها، يساراً = ليست لي." },
      { title: "تواصل مباشرة",       body: "عثرت على شقة مثيرة للاهتمام؟ افتح محادثة مباشرة مع المالك. رتب زيارة، اطرح أسئلة، تقدم. بدون وسطاء." },
    ],
    stepLabel: "خطوة",
  },
  showcase: {
    badge: "شاشات التطبيق", h2: "طرفان. تجربة واحدة.",
    sub: "مبني للمستأجرين والملاك — كل واحد بواجهة خاصة به",
    tenantBtn: "🏠  المستأجرون والمشترون", landlordBtn: "🏢  أصحاب العقارات",
    tenantLabel: "مستأجر", landlordLabel: "مالك العقار",
    tenantScreens: [
      { title: "التمرير للتصفح",     desc: "يميناً للإعجاب، يساراً للتجاوز — مع جولة 3D ونسبة التوافق." },
      { title: "عرض الشبكة",         desc: "عرض كلاسيكي مع مرشحات ذكية لجميع أنواع البحث." },
      { title: "تصفية دقيقة",        desc: "السعر والمساحة والطابق والمرافق — حددها مرة واحدة." },
      { title: "البحث على الخريطة",  desc: "اعثر على شقق على خريطة مباشرة مع تفاصيل فورية." },
      { title: "ملف العقار",         desc: "صور وسعر وموقع ومواصفات — جميع البيانات في مكان واحد." },
      { title: "تطابقاتي",           desc: "جميع الشقق التي أحببتها — جاهزة للتصرف." },
      { title: "محادثة مباشرة",      desc: "تحدث مباشرة مع المالك — بدون وسطاء." },
      { title: "ملفي الشخصي",        desc: "إدارة التفضيلات والإحصاءات ونسبة التوافق." },
    ],
    landlordScreens: [
      { title: "لوحة الأداء",         desc: "الدخل الشهري ومعدل الإشغال والعقارات النشطة — كل شيء في الوقت الفعلي." },
      { title: "تحليلات أسبوعية",     desc: "36 استفساراً هذا الأسبوع، متوسط يومي، إجراءات سريعة." },
      { title: "النشاط الأخير",        desc: "محادثات للمعالجة، أفضل التطابقات، نظرة عامة على قوائمي." },
      { title: "عقاراتي",              desc: "جميع العقارات بالسعر والموقع والحالة — إدارة كاملة." },
      { title: "ملف العقار",           desc: "كيف يرى المستأجرون شقتك — مع الصور والتفاصيل." },
      { title: "ملف المستأجر",         desc: "مستأجر مطابق لعقارك — تفاصيل وميزانية وتفضيلات." },
      { title: "تفاصيل موسعة",         desc: "جميع المعلومات التقنية والصور والموقع وخيارات الإدارة." },
      { title: "ملفي الشخصي",          desc: "إدارة الحساب والتحقق وملف مالك العقار." },
    ],
  },
  audiences: {
    badge: "لمن Rently؟", h2: "للجميع. مخصص لكل فرد.",
    sub: "سواء كنت تبحث أو تؤجر أو تتوسط — Rently مبنية من أجلك",
    cta: "ابدأ مجاناً", featured: "الأكثر شعبية",
    cards: [
      { title: "المستأجرون والمشترون", tagline: "اعثر على منزلك بشكل أسرع", bullets: ["تمرير سريع بين مئات الشقق", "نسبة توافق شخصية لكل إعلان", "جولة ثلاثية الأبعاد قبل الزيارة", "محادثة مباشرة مع المالك", "بحث على الخريطة المباشرة"] },
      { title: "الملاك والبائعون",    tagline: "اعثر على مستأجر جاد بدون وسيط", bullets: ["نشر إعلان في دقائق", "التحقق من الصور لبناء الثقة", "مسح ثلاثي الأبعاد بهاتفك", "استقبال استفسارات من مستأجرين جادين فقط", "تحليلات: مشاهدات وإعجابات واستفسارات"] },
      { title: "الوسطاء العقاريون",  tagline: "إدارة العقارات على نطاق واسع", bullets: ["ملف تجاري مع شارة وسيط", "إدارة عقارات متعددة من مكان واحد", "إدارة العملاء المحتملين", "ترويج مدفوع للعقارات المميزة", "تحليل بيانات السوق في الوقت الفعلي"] },
    ],
  },
  landlords: {
    badge: "لأصحاب العقارات", h2a: "أدِر عقاراتك", h2b: "باحترافية كاملة",
    sub: "لوحة تحكم كاملة ومستأجرون موثقون وتحليلات — كل ما تحتاجه للتأجير أسرع وبسعر أفضل",
    screens: [
      { stat: "₪28,000", statLabel: "دخل شهري",      title: "لوحة الإدارة",        desc: "نظرة عامة على الإيرادات والإشغال والعقارات النشطة — كل شيء في الوقت الفعلي." },
      { stat: "36",       statLabel: "استفسار/أسبوع", title: "التحليلات المستمرة",  desc: "تتبع المشاهدات والاستفسارات وأداء العقارات على مخطط زمني." },
      { stat: "4",        statLabel: "عقارات نشطة",   title: "إدارة الإعلانات",     desc: "جميع عقاراتك بالسعر والموقع والحالة — تحديث بنقرة واحدة." },
      { stat: "94%",      statLabel: "نسبة التوافق",  title: "ملفات المستأجرين",    desc: "اعرف من يهتم — التفاصيل والميزانية والتفضيلات في بطاقة واحدة." },
    ],
    perks: ["تحليلات فورية", "إدارة متعددة العقارات", "محادثة مباشرة", "توثيق كامل", "تتبع الدخل"],
    testimonial: { quote: "أجّرت شقتي في 4 أيام — أظهرت لوحة التحكم 18 مستأجراً محتملاً في اليوم الأول. لم أصدق.", name: "داود ل.", role: "مالك 3 عقارات، تل أبيب" },
    formTitle: "تريد الوصول المبكر?", formSub: "اترك تفاصيلك وسنتواصل معك أولاً",
    trust: "بدون رسوم • إلغاء في أي وقت • الإطلاق 2025",
  },
  testimonials: {
    badge: "ماذا يقول المستأجرون", h2: "حقيقي. من مستأجرين حقيقيين.",
    sub: "+500 مستأجر وجدوا منزلهم عبر Rently — هذا ما يقولونه",
    reviews: [
      { name: "نوعام ك.", role: "مستأجر | تل أبيب",   text: "بحثت عن شقة 6 أشهر في جميع المواقع القديمة ولم أجد شيئاً. مع Rently وجدت شقة في أسبوعين. التطبيق مختلف تماماً.", avatar: "ن" },
      { name: "ميا ر.",   role: "مستأجرة | رمات غان", text: "أحببت أن أتمكن من رؤية الشقة بجولة ثلاثية الأبعاد قبل الزيارة. وفر لي وقتاً كثيراً واكتشفت أنها مثل ما حلمت.", avatar: "م" },
      { name: "أوري ل.",  role: "مستأجر | هرتسليا",   text: "المحادثة المباشرة مع المالك غيّرت قواعد اللعبة. ردوا في دقائق وحددنا زيارة في اليوم التالي. لا وسيط، لا رسوم.", avatar: "أ" },
      { name: "شيرا ب.",  role: "مستأجرة | القدس",    text: "مرشحات Rently هي الأفضل — حددت الحيوانات الأليفة + شرفة + قرب من القطار وظهرت فقط تلك الشقق.", avatar: "ش" },
    ],
  },
  download: {
    badge: "تحميل مجاني", h2a: "شقتك القادمة", h2b: "تنتظر تمريرة",
    sub: "حمّل Rently الآن وابدأ التصفح — مجاناً تماماً، بدون وسطاء، بدون رسوم.",
    s1sub: "حمّل من", s1: "App Store", s2sub: "احصل عليه من", s2: "Google Play",
    t1: "4.8 على App Store", t2: "+500 مستأجر وجد منزله", t3: "148 إعلان نشط",
    divider: "لا تريد الانتظار لمتجر التطبيقات؟",
    formTitle: "احصل على الوصول المبكر لـ Rently", formSub: "سنرسل لك دعوة عندما يصبح التطبيق جاهزاً",
  },
  form: {
    roles: ["مستأجر / مشترٍ", "مالك / بائع", "وسيط عقاري"],
    namePH: "الاسم الكامل", emailPH: "البريد الإلكتروني", phonePH: "رقم الهاتف (اختياري)",
    submit: "انضم إلى قائمة الانتظار", loading: "جارٍ الإرسال...",
    successTitle: "تم! شكراً 🎉", successSub: "سنتواصل معك قريباً بوصول مبكر إلى Rently",
    error: "حدث خطأ — حاول مرة أخرى", disclaimer: "بدون رسوم. إلغاء في أي وقت.",
  },
  footer: {
    tagline: ".Rently تجلب تجربة السحب المألوفة للبحث عن الشقق — سريعة وممتعة وبدون رسوم",
    col1: "التطبيق", col2: "الدعم",
    col1links: ["المميزات", "شاشات التطبيق", "كيف يعمل", "لأصحاب العقارات"],
    col2links: ["الأسئلة الشائعة", "تواصل معنا", "سياسة الخصوصية", "شروط الاستخدام"],
    copy: "جميع الحقوق محفوظة.", madeIn: "صُنع بـ ❤️ في إسرائيل",
  },
};

// ─── French ───────────────────────────────────────────────────────────────────
const fr: typeof he = {
  nav: {
    problem: "Problème", how: "Comment ça marche", features: "Fonctionnalités",
    solution: "Solution", audiences: "Pour Tous", cta: "Rejoignez-nous",
  },
  hero: {
    badge: "PropTech • Israël 2025",
    h1a: "Trouvez votre", h1b: "logement comme", h1c: "vous choisissez tout",
    sub: "Moins de scroll. Meilleure compatibilité. Plus de confiance.\nLa nouvelle façon de trouver un appartement.",
    s1sub: "Télécharger sur l'", s1: "App Store", s2sub: "Obtenir sur", s2: "Google Play",
    trust: "+500 locataires ont trouvé leur logement via Rently",
  },
  stats: { items: ["Annonces actives", "Utilisateurs actifs", "Note App Store", "Visites virtuelles"] },
  problem: {
    badge: "Le Problème", h2a: "Pourquoi trouver un appartement", h2b: "est-il si pénible ?",
    sub: "Les outils qui existent aujourd'hui n'ont pas été conçus pour vous. Ils ont été conçus il y a 20 ans.", outro: "Notre solution",
    pains: [
      { stat: "1 200+", statLabel: "annonces sur Yad2", title: "Des milliers de résultats, peu pertinents", body: "Un vieux moteur de recherche qui affiche tout — sans filtrage intelligent, sans personnalisation, sans priorité pour les appartements qui vous conviennent vraiment." },
      { stat: "60%",    statLabel: "des photos",         title: "Des photos qui ne reflètent pas la réalité",  body: "Des annonces avec des photos anciennes, trompeuses ou recyclées. Vous arrivez à l'appartement et découvrez quelque chose de complètement différent." },
      { stat: "3–6",    statLabel: "semaines de recherche", title: "Un processus long et épuisant", body: "La recherche moyenne en Israël dure 3 à 6 semaines. Des journées entières de scroll, d'appels et de déceptions." },
    ],
  },
  how: {
    badge: "Comment ça marche", h2: "Trois étapes pour votre prochain logement", sub: "Simple, rapide et sans prise de tête",
    steps: [
      { title: "Définissez vos critères", body: "Choisissez la zone, le budget, le nombre de pièces et plus. Nos filtres évitent le scroll infini et ne vous montrent que ce qui est pertinent." },
      { title: "Parcourez et glissez",    body: "Chaque appartement est présenté en carte avec photos, prix, localisation et votre score de compatibilité. Droite = j'aime, Gauche = pas pour moi." },
      { title: "Contactez directement",  body: "Trouvé quelque chose d'intéressant ? Ouvrez un chat direct avec le propriétaire. Planifiez une visite, posez des questions, avancez. Sans agents." },
    ],
    stepLabel: "Étape",
  },
  showcase: {
    badge: "Écrans de l'app", h2: "Deux côtés. Une expérience.",
    sub: "Conçue pour les locataires et les propriétaires — chacun avec sa propre interface",
    tenantBtn: "🏠  Locataires et acheteurs", landlordBtn: "🏢  Propriétaires",
    tenantLabel: "Locataire", landlordLabel: "Propriétaire",
    tenantScreens: [
      { title: "Glisser pour parcourir", desc: "Glissez à droite pour aimer, à gauche pour passer — avec visite 3D et score de compatibilité." },
      { title: "Vue en grille",          desc: "Vue classique avec filtres intelligents pour tous les types de recherche." },
      { title: "Filtres précis",         desc: "Prix, superficie, étage, équipements — définissez une fois, cherchez toujours." },
      { title: "Recherche sur la carte", desc: "Trouvez des appartements sur une carte en direct avec des détails instantanés." },
      { title: "Profil du bien",         desc: "Photos, prix, localisation, caractéristiques — toutes les données en un seul endroit." },
      { title: "Mes correspondances",    desc: "Tous les appartements que vous avez aimés — prêts à agir." },
      { title: "Chat direct",            desc: "Parlez directement avec le propriétaire — sans intermédiaires." },
      { title: "Mon profil",             desc: "Gérez préférences, statistiques et score de compatibilité." },
    ],
    landlordScreens: [
      { title: "Tableau de bord",        desc: "Revenus mensuels, taux d'occupation, biens actifs — tout en temps réel." },
      { title: "Analyses hebdomadaires", desc: "36 demandes cette semaine, moyenne journalière, actions rapides." },
      { title: "Activité récente",       desc: "Conversations à traiter, meilleures correspondances, aperçu de mes annonces." },
      { title: "Mes annonces",           desc: "Tous vos biens avec prix, localisation et statut — gestion complète." },
      { title: "Profil du bien",         desc: "Comment les locataires voient votre appartement — avec photos et détails." },
      { title: "Profil locataire",       desc: "Un locataire correspondant à votre bien — détails, budget, préférences." },
      { title: "Détails étendus",        desc: "Toutes les infos techniques, photos, localisation et options de gestion." },
      { title: "Mon profil",             desc: "Gestion du compte, vérification et profil propriétaire." },
    ],
  },
  audiences: {
    badge: "Pour qui est Rently ?", h2: "Pour tous. Adapté à chacun.",
    sub: "Que vous cherchiez, louiez ou courtaisiez — Rently est conçue pour vous",
    cta: "Commencer gratuitement", featured: "Le plus populaire",
    cards: [
      { title: "Locataires et acheteurs",   tagline: "Trouvez votre logement plus vite", bullets: ["Navigation rapide parmi des centaines d'appartements", "Score de compatibilité personnelle", "Visite 3D avant de vous déplacer", "Chat direct avec le propriétaire", "Recherche sur carte en direct"] },
      { title: "Propriétaires et vendeurs", tagline: "Trouvez un locataire sérieux, sans agent", bullets: ["Publiez une annonce en quelques minutes", "Vérification des photos pour la confiance", "Scan 3D avec votre téléphone", "Recevez des demandes de locataires sérieux uniquement", "Analyses : vues, likes, demandes"] },
      { title: "Agents immobiliers",        tagline: "Gérez des biens à grande échelle", bullets: ["Profil professionnel avec badge agent", "Gestion multi-biens en un seul endroit", "CRM pour la gestion des leads", "Promotion payante pour les biens premium", "Analyse des données de marché en temps réel"] },
    ],
  },
  landlords: {
    badge: "Pour les propriétaires", h2a: "Gérez vos biens", h2b: "comme un professionnel",
    sub: "Tableau de bord complet, locataires vérifiés et analyses — tout ce dont vous avez besoin pour louer plus vite et à meilleur prix",
    screens: [
      { stat: "₪28 000", statLabel: "revenu mensuel",   title: "Tableau de gestion",  desc: "Aperçu des revenus, de l'occupation et des biens actifs — tout en temps réel." },
      { stat: "36",       statLabel: "demandes/semaine", title: "Analyses en cours",    desc: "Suivez les vues, demandes et performances de vos biens sur une ligne du temps." },
      { stat: "4",        statLabel: "biens actifs",     title: "Gestion des annonces", desc: "Tous vos biens avec prix, localisation et statut — mise à jour en un clic." },
      { stat: "94%",      statLabel: "score de match",   title: "Profils locataires",   desc: "Voyez qui s'intéresse — détails, budget et préférences en une carte." },
    ],
    perks: ["Analyses en temps réel", "Gestion multi-biens", "Chat locataire direct", "Vérification complète", "Suivi des revenus"],
    testimonial: { quote: "J'ai loué mon appartement en 4 jours — le tableau de bord m'a montré 18 locataires potentiels le premier jour. Incroyable.", name: "David L.", role: "Propriétaire de 3 biens, Tel Aviv" },
    formTitle: "Vous voulez un accès anticipé ?", formSub: "Laissez vos coordonnées et nous vous recontacterons en premier",
    trust: "Sans frais • Annulation à tout moment • Lancement 2025",
  },
  testimonials: {
    badge: "Ce que disent les locataires", h2: "Vrai. De vrais locataires.",
    sub: "+500 locataires ont déjà trouvé un logement via Rently — voici ce qu'ils disent",
    reviews: [
      { name: "Noam K.",  role: "Locataire | Tel Aviv",    text: "J'ai cherché un appartement 6 mois sur tous les vieux sites sans rien trouver. Avec Rently j'ai trouvé en deux semaines. L'appli est vraiment différente.", avatar: "N" },
      { name: "Mia R.",   role: "Locataire | Ramat Gan",   text: "J'ai adoré pouvoir voir l'appartement en visite 3D avant d'y aller. Ça m'a économisé beaucoup de temps et j'ai découvert que c'était exactement ce dont je rêvais.", avatar: "M" },
      { name: "Uri L.",   role: "Locataire | Herzliya",    text: "Le chat direct avec le propriétaire change tout. Ils ont répondu en quelques minutes, on a planifié une visite le lendemain. Pas d'agent, pas de frais.", avatar: "U" },
      { name: "Shira B.", role: "Locataire | Jérusalem",   text: "Les filtres de Rently sont ce qu'il y a de mieux — j'ai défini animaux acceptés + balcon + proche du train et seuls ces appartements sont apparus.", avatar: "S" },
    ],
  },
  download: {
    badge: "Téléchargement gratuit", h2a: "Votre prochain appartement", h2b: "attend un glissement",
    sub: "Téléchargez Rently maintenant et commencez à parcourir — entièrement gratuit, sans agents, sans frais.",
    s1sub: "Télécharger sur l'", s1: "App Store", s2sub: "Obtenir sur", s2: "Google Play",
    t1: "4.8 sur App Store", t2: "+500 locataires ont trouvé un logement", t3: "148 annonces actives",
    divider: "Vous ne voulez pas attendre l'app store ?",
    formTitle: "Obtenez un accès anticipé à Rently", formSub: "Nous vous enverrons une invitation quand l'app sera prête",
  },
  form: {
    roles: ["Locataire / Acheteur", "Propriétaire / Vendeur", "Agent immobilier"],
    namePH: "Nom complet", emailPH: "Adresse e-mail", phonePH: "Numéro de téléphone (optionnel)",
    submit: "Rejoindre la liste d'attente", loading: "Envoi en cours...",
    successTitle: "Reçu ! Merci 🎉", successSub: "Nous vous contacterons bientôt avec un accès anticipé à Rently",
    error: "Une erreur s'est produite — veuillez réessayer", disclaimer: "Sans frais. Annulation à tout moment.",
  },
  footer: {
    tagline: "Rently apporte l'expérience de glissement familière à la recherche d'appartements — rapide, ludique et sans frais.",
    col1: "Application", col2: "Assistance",
    col1links: ["Fonctionnalités", "Écrans de l'app", "Comment ça marche", "Pour les propriétaires"],
    col2links: ["FAQ", "Nous contacter", "Politique de confidentialité", "Conditions d'utilisation"],
    copy: "Tous droits réservés.", madeIn: "Fait avec ❤️ en Israël",
  },
};

// ─── Spanish ──────────────────────────────────────────────────────────────────
const es: typeof he = {
  nav: {
    problem: "Problema", how: "Cómo funciona", features: "Funciones",
    solution: "Solución", audiences: "Para Ti", cta: "Únete ahora",
  },
  hero: {
    badge: "PropTech • Israel 2025",
    h1a: "Encuentra tu", h1b: "hogar a tu", h1c: "manera",
    sub: "Menos scroll. Mejor compatibilidad. Más confianza.\nLa nueva forma de encontrar apartamento.",
    s1sub: "Descargar en", s1: "App Store", s2sub: "Obtener en", s2: "Google Play",
    trust: "+500 inquilinos encontraron hogar con Rently",
  },
  stats: { items: ["Anuncios activos", "Usuarios activos", "Calificación App Store", "Tours virtuales"] },
  problem: {
    badge: "El Problema", h2a: "¿Por qué encontrar un piso", h2b: "es tan complicado?",
    sub: "Las herramientas que existen hoy no fueron diseñadas para ti. Fueron diseñadas hace 20 años.", outro: "Nuestra solución",
    pains: [
      { stat: "1.200+", statLabel: "anuncios en Yad2", title: "Miles de resultados, pocos relevantes",    body: "Un motor de búsqueda viejo que lo muestra todo — sin filtrado inteligente, sin personalización, sin prioridad para los pisos que realmente te encajan." },
      { stat: "60%",    statLabel: "de las fotos",      title: "Fotos que no reflejan la realidad",        body: "Anuncios con fotos antiguas, engañosas o recicladas. Llegas al piso y encuentras algo completamente diferente." },
      { stat: "3–6",    statLabel: "semanas buscando",  title: "Un proceso largo y agotador",              body: "La búsqueda promedio en Israel dura de 3 a 6 semanas. Días enteros de scroll, llamadas y decepciones." },
    ],
  },
  how: {
    badge: "Cómo funciona", h2: "Tres pasos a tu próximo hogar", sub: "Simple, rápido y sin estrés",
    steps: [
      { title: "Define tus criterios", body: "Elige zona, presupuesto, número de habitaciones y más. Nuestros filtros evitan el scroll infinito y solo te muestran lo relevante." },
      { title: "Desliza y explora",    body: "Cada piso se muestra como una tarjeta con fotos, precio, ubicación y tu puntuación de compatibilidad personal. Derecha = me gusta, Izquierda = no es para mí." },
      { title: "Contacta directamente",body: "¿Encontraste algo interesante? Abre un chat directo con el propietario. Programa una visita, haz preguntas, avanza. Sin agentes." },
    ],
    stepLabel: "Paso",
  },
  showcase: {
    badge: "Pantallas de la app", h2: "Dos lados. Una experiencia.",
    sub: "Diseñada para inquilinos y propietarios — cada uno con su propia interfaz",
    tenantBtn: "🏠  Inquilinos y compradores", landlordBtn: "🏢  Propietarios",
    tenantLabel: "Inquilino", landlordLabel: "Propietario",
    tenantScreens: [
      { title: "Deslizar para explorar", desc: "Desliza a la derecha para gustar, a la izquierda para pasar — con tour 3D y puntuación de compatibilidad." },
      { title: "Vista en cuadrícula",    desc: "Vista clásica con filtros inteligentes para todos los tipos de búsqueda." },
      { title: "Filtros precisos",       desc: "Precio, superficie, piso, comodidades — configúralos una vez." },
      { title: "Búsqueda en el mapa",    desc: "Encuentra pisos en un mapa en vivo con detalles instantáneos." },
      { title: "Perfil de propiedad",    desc: "Fotos, precio, ubicación, características — todos los datos en un lugar." },
      { title: "Mis coincidencias",      desc: "Todos los pisos que te gustaron — listos para actuar." },
      { title: "Chat directo",           desc: "Habla directamente con el propietario — sin intermediarios." },
      { title: "Mi perfil",              desc: "Gestiona preferencias, estadísticas y tu puntuación." },
    ],
    landlordScreens: [
      { title: "Panel de rendimiento", desc: "Ingresos mensuales, tasa de ocupación, propiedades activas — todo en tiempo real." },
      { title: "Analíticas semanales",  desc: "36 consultas esta semana, promedio diario, acciones rápidas." },
      { title: "Actividad reciente",    desc: "Conversaciones por atender, mejores coincidencias, mis anuncios." },
      { title: "Mis anuncios",          desc: "Todas las propiedades con precio, ubicación y estado — gestión completa." },
      { title: "Perfil de propiedad",   desc: "Cómo ven los inquilinos tu piso — con fotos y detalles." },
      { title: "Perfil del inquilino",  desc: "Inquilino que coincide con tu propiedad — detalles, presupuesto, preferencias." },
      { title: "Detalles ampliados",    desc: "Toda la información técnica, fotos, ubicación y opciones de gestión." },
      { title: "Mi perfil",             desc: "Gestión de cuenta, verificación y perfil de propietario." },
    ],
  },
  audiences: {
    badge: "¿Para quién es Rently?", h2: "Para todos. Adaptada a cada uno.",
    sub: "Ya sea que busques, alquiles o intermedies — Rently está diseñada para ti",
    cta: "Empezar gratis", featured: "Más popular",
    cards: [
      { title: "Inquilinos y compradores",   tagline: "Encuentra tu hogar más rápido",      bullets: ["Navegación rápida entre cientos de pisos", "Puntuación de compatibilidad personal", "Tour 3D antes de visitar en persona", "Chat directo con el propietario", "Búsqueda en mapa en vivo"] },
      { title: "Propietarios y vendedores",  tagline: "Encuentra inquilinos serios sin agente", bullets: ["Publica un anuncio en minutos", "Verificación de fotos para generar confianza", "Escaneo 3D con tu teléfono", "Recibe solo consultas de inquilinos serios", "Analíticas: vistas, likes, consultas"] },
      { title: "Agentes inmobiliarios",      tagline: "Gestiona propiedades a gran escala", bullets: ["Perfil empresarial con insignia de agente", "Gestiona múltiples propiedades desde un lugar", "CRM para gestión de leads", "Promoción de pago para propiedades premium", "Análisis de datos de mercado en tiempo real"] },
    ],
  },
  landlords: {
    badge: "Para propietarios", h2a: "Gestiona tus propiedades", h2b: "como un profesional",
    sub: "Panel completo, inquilinos verificados y analíticas — todo lo que necesitas para alquilar más rápido y a mejor precio",
    screens: [
      { stat: "₪28.000", statLabel: "ingreso mensual",    title: "Panel de gestión",   desc: "Resumen de ingresos, ocupación y propiedades activas — todo en tiempo real." },
      { stat: "36",       statLabel: "consultas/semana",  title: "Analíticas continuas",desc: "Sigue vistas, consultas y rendimiento de tus propiedades en una línea de tiempo." },
      { stat: "4",        statLabel: "propiedades activas",title: "Gestión de anuncios", desc: "Todas tus propiedades con precio, ubicación y estado — actualización en un clic." },
      { stat: "94%",      statLabel: "puntuación de match",title: "Perfiles de inquilinos",desc: "Ve quién está interesado — detalles, presupuesto y preferencias en una tarjeta." },
    ],
    perks: ["Analíticas en tiempo real", "Gestión múltiple", "Chat directo", "Verificación completa", "Seguimiento de ingresos"],
    testimonial: { quote: "Alquilé mi piso en 4 días — el panel me mostró 18 posibles inquilinos el primer día. No podía creerlo.", name: "David L.", role: "Propietario de 3 inmuebles, Tel Aviv" },
    formTitle: "¿Quieres acceso anticipado?", formSub: "Deja tus datos y te contactaremos primero",
    trust: "Sin comisiones • Cancela cuando quieras • Lanzamiento 2025",
  },
  testimonials: {
    badge: "Lo que dicen los inquilinos", h2: "Real. De inquilinos reales.",
    sub: "+500 inquilinos ya encontraron hogar con Rently — esto es lo que dicen",
    reviews: [
      { name: "Noam K.",  role: "Inquilino | Tel Aviv",    text: "Busqué piso 6 meses en todos los sitios viejos y no encontré nada. Con Rently encontré piso en dos semanas. La app es simplemente diferente.", avatar: "N" },
      { name: "Mia R.",   role: "Inquilina | Ramat Gan",   text: "Me encantó poder ver el piso en tour 3D antes de visitarlo. Me ahorró mucho tiempo y descubrí que era exactamente lo que soñaba.", avatar: "M" },
      { name: "Uri L.",   role: "Inquilino | Herzliya",    text: "El chat directo con el propietario es un cambio total. Respondieron en minutos, concertamos visita al día siguiente. Sin agente, sin comisiones.", avatar: "U" },
      { name: "Shira B.", role: "Inquilina | Jerusalén",   text: "Los filtros de Rently son lo mejor — configuré mascotas permitidas + balcón + cerca del tren y solo aparecieron esos pisos.", avatar: "S" },
    ],
  },
  download: {
    badge: "Descarga gratuita", h2a: "Tu próximo piso", h2b: "espera un deslizamiento",
    sub: "Descarga Rently ahora y empieza a explorar pisos — completamente gratis, sin agentes, sin comisiones.",
    s1sub: "Descargar en", s1: "App Store", s2sub: "Obtener en", s2: "Google Play",
    t1: "4.8 en App Store", t2: "+500 inquilinos encontraron hogar", t3: "148 anuncios activos",
    divider: "¿No quieres esperar a la app store?",
    formTitle: "Obtén acceso anticipado a Rently", formSub: "Te enviaremos una invitación cuando la app esté lista",
  },
  form: {
    roles: ["Inquilino / Comprador", "Propietario / Vendedor", "Agente inmobiliario"],
    namePH: "Nombre completo", emailPH: "Correo electrónico", phonePH: "Número de teléfono (opcional)",
    submit: "Unirse a la lista de espera", loading: "Enviando...",
    successTitle: "¡Recibido! Gracias 🎉", successSub: "Te contactaremos pronto con acceso anticipado a Rently",
    error: "Algo salió mal — inténtalo de nuevo", disclaimer: "Sin comisiones. Cancela cuando quieras.",
  },
  footer: {
    tagline: "Rently trae la familiar experiencia de deslizamiento a la búsqueda de pisos — rápida, divertida y sin comisiones.",
    col1: "Aplicación", col2: "Soporte",
    col1links: ["Funciones", "Pantallas de la app", "Cómo funciona", "Para propietarios"],
    col2links: ["Preguntas frecuentes", "Contáctanos", "Política de privacidad", "Términos de uso"],
    copy: "Todos los derechos reservados.", madeIn: "Hecho con ❤️ en Israel",
  },
};

export const translations: Record<Lang, typeof he> = { he, en, ar, fr, es };
export type T = typeof he;
