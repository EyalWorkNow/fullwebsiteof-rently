import Link from "next/link";

export default function NotFound() {
  return (
    <main className="pt-32 pb-24 text-center px-4">
      <div className="max-w-[480px] mx-auto">
        <div className="text-6xl font-black text-primary">404</div>
        <h1 className="mt-4 text-2xl font-black text-navy">
          העמוד הזה לא נמצא
        </h1>
        <p className="text-secondary-text mt-2">
          יכול להיות שהקישור שגוי או שהעמוד הוסר.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center bg-primary hover:bg-primary-dark transition-colors rounded-full px-6 py-3 text-white font-bold"
        >
          חזרה לדף הבית
        </Link>
      </div>
    </main>
  );
}
