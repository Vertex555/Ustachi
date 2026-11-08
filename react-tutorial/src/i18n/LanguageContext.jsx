import React, { createContext, useContext, useState, useCallback } from "react";
import translations from "./translations";

const LanguageContext = createContext();

const LANGUAGES = [
  { code: "uz", label: "O'zbek", flag: "🇺🇿", name: "O'zbekcha", flagUrl: "https://api.iconify.design/circle-flags:uz.svg" },
  { code: "ru", label: "Русский", flag: "🇷🇺", name: "Русский", flagUrl: "https://api.iconify.design/circle-flags:ru.svg" },
  { code: "en", label: "English", flag: "🇬🇧", name: "English", flagUrl: "https://api.iconify.design/circle-flags:gb.svg" },
];

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("ustachi_lang") || "uz";
    } catch {
      return "uz";
    }
  });

  const [chosen, setChosen] = useState(() => {
    try {
      return !!localStorage.getItem("ustachi_lang");
    } catch {
      return true;
    }
  });

  const t = useCallback(
    (key, fallback) => {
      const val = translations[lang]?.[key] || translations.en?.[key] || fallback || key;
      return val;
    },
    [lang]
  );

  const changeLang = (code) => {
    setLang(code);
    setChosen(true);
    try { localStorage.setItem("ustachi_lang", code); } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, languages: LANGUAGES, chosen }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}