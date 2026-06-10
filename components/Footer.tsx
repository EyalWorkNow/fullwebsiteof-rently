"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Instagram, Facebook, Youtube } from "iconsax-react";
import { useTranslation } from "@/contexts/LanguageContext";

const footerLinks = [
  [{ href: "#features" }, { href: "#showcase" }, { href: "#how" }, { href: "#landlords" }],
  [{ href: "#" }, { href: "#" }, { href: "#" }, { href: "#" }],
];

const socials = [
  { icon: Instagram, href: "#", label: "Instagram", color: "#E1306C" },
  { icon: Facebook,  href: "#", label: "Facebook",  color: "#1877F2" },
  { icon: Youtube,   href: "#", label: "YouTube",   color: "#FF0000" },
];

export default function Footer() {
  const { t } = useTranslation();
  const cols = [
    { heading: t.footer.col1, links: t.footer.col1links },
    { heading: t.footer.col2, links: t.footer.col2links },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
      viewport={{ once: true }} transition={{ duration: 0.6 }}
      className="py-14 px-4"
      style={{ background: "#F8FBFF", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12 mb-12">

          <div className="flex-1 max-w-xs">
            <a href="#" aria-label="Rently">
              <Image src="/logo.png" alt="Rently" width={100} height={32} className="mb-4" style={{ height: "auto" }} />
            </a>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">{t.footer.tagline}</p>
            <div className="flex gap-3">
              {socials.map(({ icon: Icon, href, label, color }) => (
                <motion.a key={label} href={href} aria-label={label}
                  whileHover={{ y: -3, scale: 1.1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                  style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <Icon size={16} color={color} variant="Bold" />
                </motion.a>
              ))}
            </div>
          </div>

          <div className="flex gap-16">
            {cols.map((col, ci) => (
              <div key={ci}>
                <h4 className="text-[10px] font-black text-[#1A2B4A] uppercase tracking-widest mb-4">{col.heading}</h4>
                <ul className="space-y-3">
                  {col.links.map((label, li) => (
                    <li key={li}>
                      <a href={footerLinks[ci][li].href}
                        className="text-sm text-slate-500 hover:text-[#17BDB0] transition-colors duration-200 cursor-pointer">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-sm text-slate-400"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <p>© {new Date().getFullYear()} Rently. {t.footer.copy}</p>
          <p>{t.footer.madeIn}</p>
        </div>
      </div>
    </motion.footer>
  );
}
