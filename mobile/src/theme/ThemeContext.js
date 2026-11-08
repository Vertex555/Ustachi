import React, { createContext, useState, useContext, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import { light, dark } from "./tokens";
import { applyCustomTheme } from "./palette";
import { normalizeTheme, resolveTheme, clampFontScale } from "../settings/logic";
import { getPrefs, subscribePrefs, updateTheme, updateFontScale, updateReduceMotion } from "../services/prefs";

// Eski kalitlardan o'qish (migratsiya uchun): eski foydalanuvchilar
// "ustachi_theme" ichida "light"/"dark" saqlagan edi.
const LEGACY_THEME_KEY = "ustachi_theme";
const COLORS_KEY = "ustachi_custom_colors";

const ThemeContext = createContext(null);

// Boshlang'ich qiymatlar — serverdan kelguncha ekron to'g'ri bo'lishi uchun
let cachedMode = "system";
let cachedCustom = {};
let cachedFontScale = 1;
let cachedReduceMotion = false;

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();

  const [mode, setMode] = useState(cachedMode);
  const [custom, setCustom] = useState(cachedCustom);
  const [fontScale, setFontScale] = useState(cachedFontScale);
  const [reduceMotion, setReduceMotion] = useState(cachedReduceMotion);

  // Serverdagi sozlamalarni kuzatamiz
  useEffect(() => {
    const unsub = subscribePrefs(({ preferences }) => {
      const p = preferences || {};
      setMode(normalizeTheme(p.theme, "system"));
      setFontScale(clampFontScale(p.fontScale == null ? 1 : p.fontScale));
      setReduceMotion(!!p.reduceMotion);
    });
    return unsub;
  }, []);

  // Eski lokal kalitlarini bir marta o'qib, prefs store'ga bo'sh qiymat sifatida o'tkazamiz
  useEffect(() => {
    let active = true;
    (async () => {
      const { getItem } = await import("../services/storage");
      const [legacy, colors] = await Promise.all([getItem(LEGACY_THEME_KEY), getItem(COLORS_KEY)]);
      if (!active) return;
      if (legacy === "light" || legacy === "dark") {
        // Eski foydalanuvchi aniq rejim tanlagan — "system" emas
        setMode((prev) => (prev === "system" ? legacy : prev));
        if (colors) {
          try {
            const p = JSON.parse(colors);
            if (p && typeof p === "object" && Object.keys(p).length) {
              setCustom(p);
              cachedCustom = p;
            }
          } catch {}
        }
      }
    })();
    return () => { active = false; };
  }, []);

  // "system" rejimda qurilma mavzusiga avtomatik moslashadi
  const resolvedMode = resolveTheme(mode, systemScheme);

  const setTheme = async (m) => {
    const next = normalizeTheme(m, "system");
    setMode(next);
    cachedMode = next;
    await updateTheme(next);
  };

  const setFontScalePref = async (v) => {
    const next = clampFontScale(v);
    setFontScale(next);
    cachedFontScale = next;
    await updateFontScale(next);
  };

  const setReduceMotionPref = async (v) => {
    const on = !!v;
    setReduceMotion(on);
    cachedReduceMotion = on;
    await updateReduceMotion(on);
  };

  // Shrift o'lchami custom ichida uzatiladi (applyCustomTheme uni allaqachon qo'llaydi)
  const mergedCustom = useMemo(() => ({ ...custom, fontScale }), [custom, fontScale]);

  const base = resolvedMode === "dark" ? dark : light;
  const theme = useMemo(() => {
    const t = applyCustomTheme(base, mergedCustom);
    return { ...t, reduceMotion, fontScale };
  }, [base, mergedCustom, reduceMotion, fontScale]);

  const setUiColors = async (patch = {}) => {
    const next = { ...custom, ...patch };
    for (const k of ["accent", "secondary", "bg", "surface"]) {
      if (next[k]) next[k] = String(next[k]).toUpperCase();
    }
    setCustom(next);
    cachedCustom = next;
    const { setItem } = await import("../services/storage");
    await setItem(COLORS_KEY, JSON.stringify(next));
  };

  const resetUiColors = async () => {
    setCustom({});
    cachedCustom = {};
    const { removeItem } = await import("../services/storage");
    await removeItem(COLORS_KEY);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        // Tanlangan rejim ("system" | "light" | "dark")
        mode,
        // Haqiqiy ko'rinadigan rejim ("light" | "dark")
        resolvedMode,
        custom,
        fontScale,
        reduceMotion,
        setTheme,
        setFontScale: setFontScalePref,
        setReduceMotion: setReduceMotionPref,
        setUiColors,
        resetUiColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
