"use client";

import { useState, type FormEvent } from "react";
import {
  Sms,
  Clock,
  TickCircle,
  Instagram,
  Facebook,
  Youtube,
} from "iconsax-react";

const socials = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

const inputCls =
  "bg-cloud rounded-2xl px-4 py-3 w-full text-[15px] outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block text-[13px] font-bold text-navy mb-1.5";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("tenant");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFieldError("שם ואימייל הם שדות חובה");
      return;
    }
    setFieldError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          source: "contact-page",
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="pt-28 pb-20">
      <div className="max-w-[980px] mx-auto px-4">
        <h1 className="text-3xl md:text-5xl font-black text-navy leading-tight">
          צור קשר
        </h1>
        <p className="text-secondary-text text-lg mt-3">
          שאלה, רעיון או סתם להגיד שלום — אנחנו כאן.
        </p>

        <div className="grid md:grid-cols-[1fr_380px] gap-10 mt-10">
          {/* Info card */}
          <div className="bg-navy-deep text-white rounded-[28px] p-8 h-fit">
            <h2 className="font-black text-2xl">נשמח לשמוע מכם</h2>
            <p className="text-white/70 text-[14px] leading-relaxed mt-2">
              עונים לכל פנייה — בדרך כלל תוך יום עסקים אחד.
            </p>

            <div className="mt-7 space-y-4">
              <a
                href="mailto:support@rently.co.il"
                className="flex items-center gap-3 group"
              >
                <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Sms size={20} color="#FFFFFF" variant="Bold" />
                </span>
                <span className="text-[15px] font-bold group-hover:underline">
                  support@rently.co.il
                </span>
              </a>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Clock size={20} color="#FFFFFF" variant="Bold" />
                </span>
                <span className="text-[15px]">ימים א׳–ה׳ 9:00–18:00</span>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                >
                  <Icon size={18} color="#FFFFFF" variant="Bold" />
                </a>
              ))}
            </div>
          </div>

          {/* Form */}
          <div>
            {status === "success" ? (
              <div className="bg-white border border-border-app rounded-3xl p-8 card-shadow text-center">
                <TickCircle
                  size={40}
                  color="#27AE60"
                  variant="Bold"
                  className="mx-auto"
                />
                <p className="font-black text-navy text-lg mt-4">
                  קיבלנו! נחזור אליכם ממש בקרוב
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="name" className={labelCls}>
                    שם מלא*
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelCls}>
                    אימייל*
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={labelCls}>
                    טלפון
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                    dir="ltr"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label htmlFor="role" className={labelCls}>
                    אני…
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={inputCls}
                  >
                    <option value="tenant">שוכר/קונה</option>
                    <option value="landlord">בעל דירה</option>
                    <option value="agent">מתווך</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className={labelCls}>
                    הודעה
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {fieldError && (
                  <p className="text-coral text-[13px] font-bold">
                    {fieldError}
                  </p>
                )}
                {status === "error" && (
                  <p className="text-coral text-[13px] font-bold">
                    משהו השתבש — נסו שוב
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="bg-primary hover:bg-primary-dark transition-colors rounded-full py-3.5 text-white font-bold w-full disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "sending" ? "שולח…" : "שליחה"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
