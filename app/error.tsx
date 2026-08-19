"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="pt-32 pb-24 text-center px-4">
      <div className="max-w-[480px] mx-auto">
        <h1 className="text-2xl font-black text-navy">משהו השתבש</h1>
        <p className="text-secondary-text mt-2">
          קרתה תקלה בטעינת העמוד. אפשר לנסות שוב.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center bg-primary hover:bg-primary-dark transition-colors rounded-full px-6 py-3 text-white font-bold"
        >
          ניסיון נוסף
        </button>
      </div>
    </main>
  );
}
