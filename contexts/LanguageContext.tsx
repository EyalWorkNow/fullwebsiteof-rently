"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Lang, Dir, langDir, translations, T } from "@/lib/translations";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: T; dir: Dir };

const LanguageContext = createContext<Ctx>({
  lang: "he", setLang: () => {}, t: translations.he, dir: "rtl",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");

  useEffect(() => {
    const saved = localStorage.getItem("rently-lang") as Lang | null;
    if (saved && translations[saved]) setLangState(saved);
  }, []);

  useEffect(() => {
    const dir = langDir[lang];
    document.documentElement.dir  = dir;
    document.documentElement.lang = lang;
    localStorage.setItem("rently-lang", lang);
  }, [lang]);

  function setLang(l: Lang) { setLangState(l); }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang], dir: langDir[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() { return useContext(LanguageContext); }
