"use client";

// Only fires if the root layout itself crashes — replaces <html>/<body>
// entirely, so it must supply its own (Next.js requirement for this file).
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <main style={{ textAlign: "center", padding: "6rem 1rem", fontFamily: "sans-serif" }}>
          <h1>משהו השתבש</h1>
          <p>קרתה תקלה בטעינת האתר. אפשר לנסות שוב.</p>
          <button onClick={reset} style={{ marginTop: "1.5rem", padding: "0.75rem 1.5rem" }}>
            ניסיון נוסף
          </button>
        </main>
      </body>
    </html>
  );
}
