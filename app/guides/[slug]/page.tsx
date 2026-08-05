import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guides, getGuide } from "@/lib/guides";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "חכם לדעת | Rently" };
  return {
    title: `${guide.title} | Rently`,
    description: guide.teaser,
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <main className="pt-28 pb-20">
      <article className="max-w-[720px] mx-auto px-4">
        <nav className="text-[13px] text-secondary-text">
          <a href="/guides" className="text-primary font-bold hover:underline">
            חכם לדעת
          </a>
          <span className="mx-2">/</span>
          <span>{guide.title}</span>
        </nav>

        <h1 className="text-3xl font-black text-navy mt-4">{guide.title}</h1>
        <p className="text-[13px] text-secondary-text mt-2">
          {guide.minutes} דקות קריאה · Rently
        </p>

        <div className="space-y-5 mt-8">
          {guide.body.map((paragraph, i) => (
            <p key={i} className="text-[16px] leading-[1.9] text-navy/90">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="bg-primary-light2 rounded-[28px] p-8 text-center mt-12">
          <h2 className="font-black text-navy text-xl">מוכנים לדירה הבאה?</h2>
          <a
            href="https://apps.apple.com/il/app/id6773088152"
            className="inline-block bg-primary text-white rounded-full px-6 py-3 font-bold mt-4"
          >
            להורדת Rently
          </a>
        </div>
      </article>
    </main>
  );
}
