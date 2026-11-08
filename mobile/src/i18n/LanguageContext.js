import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "./translations";
import { subscribePrefs, updateLanguage } from "../services/prefs";
import { normalizeLanguage } from "../settings/logic";

const LanguageContext = createContext();

const LANGUAGES = [
  { code: "uz", label: "O'zbek", native: "O'zbekcha", flag: "🇺🇿", flagUrl: "https://api.iconify.design/circle-flags:uz.svg" },
  { code: "ru", label: "Русский", native: "Русский", flag: "🇷🇺", flagUrl: "https://api.iconify.design/circle-flags:ru.svg" },
  { code: "en", label: "English", native: "English", flag: "🇬🇧", flagUrl: "https://api.iconify.design/circle-flags:gb.svg" },
];

const LANG_KEY = "ustachi_lang";

let cachedLang = "uz";
AsyncStorage.getItem(LANG_KEY).then((v) => { if (v) cachedLang = v; }).catch(() => {});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(normalizeLanguage(cachedLang, "uz"));

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LANG_KEY).then((v) => {
      if (!active) return;
      if (v === "uz" || v === "ru" || v === "en") setLang(v);
    });
    return () => { active = false; };
  }, []);

  // Serverdagi til pref'i (boshqa qurilmada o'zgartirilgan bo'lsa ham saqlansin)
  useEffect(() => {
    const unsub = subscribePrefs(({ preferences }) => {
      const next = normalizeLanguage(preferences?.language, "uz");
      setLang((prev) => (prev === next ? prev : next));
    });
    return unsub;
  }, []);

  const t = useCallback(
    (key, fallback) => {
      const val = translations[lang]?.[key] || translations.en?.[key] || fallback || key;
      return val;
    },
    [lang]
  );

  // Til o'zgarishi avval lokalga, so'ng serverga yoziladi
  const changeLang = (code) => {
    const next = normalizeLanguage(code, "uz");
    setLang(next);
    cachedLang = next;
    AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
    updateLanguage(next).catch(() => {});
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}