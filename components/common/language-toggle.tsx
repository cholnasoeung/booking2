"use client";

import { useLanguage } from "@/lib/utils/language-context";

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "km" : "en")}
      className="rounded-full border border-white/70 bg-white/85 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-white min-w-[52px]"
      title={lang === "en" ? "Switch to Khmer" : "Switch to English"}
    >
      {lang === "en" ? "🇰🇭 ខ្មែរ" : "🇬🇧 EN"}
    </button>
  );
}
