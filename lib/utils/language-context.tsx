"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type Language, type TranslationKey, getTranslation } from "@/lib/utils/translations";

type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang") as Language | null;
    if (stored === "en" || stored === "km") setLangState(stored);
  }, []);

  function setLang(newLang: Language) {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
  }

  function t(key: TranslationKey): string {
    return getTranslation(lang, key);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
