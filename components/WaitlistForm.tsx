"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sms, Call, TickCircle, CloseCircle } from "iconsax-react";
import { useTranslation } from "@/contexts/LanguageContext";

const roleIds = ["tenant", "landlord", "agent"] as const;
const roleColors = ["#17BDB0", "#6366F1", "#FF6B7A"];

type Props = {
  source?: string;
  defaultRole?: "tenant" | "landlord" | "agent";
  darkMode?: boolean;
  compact?: boolean;
  title?: string;
  subtitle?: string;
};

export default function WaitlistForm({
  source = "general",
  defaultRole = "tenant",
  darkMode = false,
  compact = false,
  title,
  subtitle,
}: Props) {
  const { t } = useTranslation();
  const [role, setRole] = useState<typeof roleIds[number]>(defaultRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const c = (light: string, dark: string) => (darkMode ? dark : light);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, role, source }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch { setStatus("error"); }
  }

  const inputBase = `w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200 ${
    darkMode
      ? "bg-white/8 border border-white/12 text-white placeholder:text-white/35 focus:border-[#17BDB0] focus:bg-white/12"
      : "bg-white border border-slate-200 text-[#1A2B4A] placeholder:text-slate-400 focus:border-[#17BDB0] focus:ring-2 focus:ring-[#17BDB0]/15"
  }`;

  return (
    <div className={compact ? "" : "w-full"}>
      {!compact && (
        <div className="mb-6 text-center">
          <h3 className={`text-xl font-black mb-1 ${c("text-[#1A2B4A]", "text-white")}`}>
            {title || t.download.formTitle}
          </h3>
          <p className={`text-sm ${c("text-slate-500", "text-slate-300")}`}>
            {subtitle || t.download.formSub}
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div key="success"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(23,189,176,0.12)" }}>
              <TickCircle size={36} color="#17BDB0" variant="Bold" />
            </div>
            <h4 className={`text-lg font-black ${c("text-[#1A2B4A]", "text-white")}`}>{t.form.successTitle}</h4>
            <p className={`text-sm ${c("text-slate-500", "text-slate-300")}`}>{t.form.successSub}</p>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} className="space-y-3">

            {/* Role tabs */}
            <div className="flex gap-2 mb-4">
              {roleIds.map((id, i) => (
                <button key={id} type="button" onClick={() => setRole(id)}
                  className="flex-1 py-2 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200"
                  style={{
                    background: role === id ? `${roleColors[i]}18` : darkMode ? "rgba(255,255,255,0.06)" : "#F8FAFC",
                    color: role === id ? roleColors[i] : darkMode ? "rgba(255,255,255,0.45)" : "#94A3B8",
                    border: `1.5px solid ${role === id ? roleColors[i] + "50" : "transparent"}`,
                  }}>
                  {t.form.roles[i]}
                </button>
              ))}
            </div>

            <div className="relative">
              <User size={16} color={darkMode ? "rgba(255,255,255,0.4)" : "#94A3B8"}
                className="absolute top-1/2 -translate-y-1/2 end-3.5 pointer-events-none" />
              <input value={name} onChange={e => setName(e.target.value)} required
                placeholder={t.form.namePH} className={`${inputBase} pe-9`} />
            </div>

            <div className="relative">
              <Sms size={16} color={darkMode ? "rgba(255,255,255,0.4)" : "#94A3B8"}
                className="absolute top-1/2 -translate-y-1/2 end-3.5 pointer-events-none" />
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
                placeholder={t.form.emailPH} className={`${inputBase} pe-9`} />
            </div>

            <div className="relative">
              <Call size={16} color={darkMode ? "rgba(255,255,255,0.4)" : "#94A3B8"}
                className="absolute top-1/2 -translate-y-1/2 end-3.5 pointer-events-none" />
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
                placeholder={t.form.phonePH} className={`${inputBase} pe-9`} />
            </div>

            <motion.button type="submit" disabled={status === "loading"}
              whileHover={{ scale: status === "loading" ? 1 : 1.02, y: status === "loading" ? 0 : -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="relative w-full py-3.5 rounded-xl font-bold text-white text-sm cursor-pointer overflow-hidden disabled:opacity-70"
              style={{ background: "linear-gradient(135deg, #17BDB0, #0F8A80)", boxShadow: "0 8px 24px rgba(23,189,176,0.3)" }}>
              <span className="absolute inset-0 shimmer-bg opacity-30 pointer-events-none" />
              <span className="relative">{status === "loading" ? t.form.loading : t.form.submit}</span>
            </motion.button>

            {status === "error" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-xs text-red-400 justify-center">
                <CloseCircle size={14} color="#F87171" variant="Bold" />
                {t.form.error}
              </motion.div>
            )}

            <p className={`text-[10px] text-center ${c("text-slate-400", "text-white/30")}`}>{t.form.disclaimer}</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
