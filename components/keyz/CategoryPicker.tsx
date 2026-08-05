import { House2, Key, Box1, Briefcase } from "iconsax-react";

const CATEGORIES = [
  { Icon: House2, label: "דירות להשכרה", href: "/real-estate" },
  { Icon: Key, label: "דירות למכירה", href: "/real-estate" },
  { Icon: Box1, label: "סיורי 360", href: "/guides/how-360-tours-work" },
  { Icon: Briefcase, label: "למתווכים", href: "/publish" },
];

export default function CategoryPicker() {
  return (
    <section className="mx-auto -mt-2 max-w-[1200px] px-4 pb-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CATEGORIES.map(({ Icon, label, href }) => (
          <a
            key={label}
            href={href}
            className="card-shadow flex flex-col items-center gap-3 rounded-3xl border border-border-app bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary"
          >
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-primary-light2">
              <Icon size={26} color="currentColor" className="text-primary" />
            </span>
            <span className="text-[15px] font-bold text-navy">{label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
