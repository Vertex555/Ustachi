import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { light, dark } from "./tokens";
import { applyCustomTheme } from "./palette";

const ThemeContext = createContext();

function loadColors() {
  try {
    const raw = localStorage.getItem("ustachi_custom_colors");
    const parsed = raw ? JSON.parse(raw) : {};
    const out = {};
    if (parsed && typeof parsed === "object") {
      if (parsed.accent) out.accent = String(parsed.accent);
      if (parsed.secondary) out.secondary = String(parsed.secondary);
      if (parsed.bg) out.bg = String(parsed.bg);
      if (parsed.surface) out.surface = String(parsed.surface);
      if (parsed.fontFamily) out.fontFamily = String(parsed.fontFamily);
      if (parsed.fontScale) out.fontScale = Number(parsed.fontScale) || 1;
    }
    return out;
  } catch {
    return {};
  }
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem("ustachi_theme") || "light";
    } catch {
      return "light";
    }
  });

  const [custom, setCustom] = useState(loadColors);

  const base = mode === "dark" ? dark : light;
  const theme = useMemo(() => applyCustomTheme(base, custom), [base, custom]);

  const setUiColors = (patch = {}) => {
    setCustom((prev) => {
      const next = { ...prev, ...patch };
      for (const k of ["accent", "secondary", "bg", "surface"]) {
        if (next[k]) next[k] = String(next[k]).toUpperCase();
      }
      if (next.fontScale) next.fontScale = Number(next.fontScale) || 1;
      try { localStorage.setItem("ustachi_custom_colors", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const resetUiColors = () => {
    setCustom({});
    try { localStorage.removeItem("ustachi_custom_colors"); } catch {}
  };

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("ustachi_theme", next); } catch {}
      return next;
    });
  };

  const setTheme = (newMode) => {
    setMode(newMode);
    try { localStorage.setItem("ustachi_theme", newMode); } catch {}
  };

  useEffect(() => {
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;
    document.body.style.transition = `background-color ${theme.transition.normal}`;
    if (theme.font?.family) document.body.style.fontFamily = theme.font.family;

    // Dinamik ranglarni CSS o'zgaruvchilari orqali ham beramiz
    const root = document.documentElement;
    if (root) {
      // Dark/light holatini DOM'da belgilaymiz — CSS fallback soyalar ham
      // to'g'ri rejimda ishlasin (JS hali ishlamagan paytdagi birinchi kadr uchun)
      root.setAttribute("data-theme", theme.mode);
      root.style.setProperty("--ustach-bg", theme.bg);
      root.style.setProperty("--ustach-surface", theme.surface);
      root.style.setProperty("--ustach-accent", theme.primary);
      root.style.setProperty("--ustach-text", theme.text);
      root.style.setProperty("--ustach-text-secondary", theme.textSecondary);
      root.style.setProperty("--ustach-border", theme.border);
      root.style.setProperty("--ustach-surface-hover", theme.surfaceHover || theme.surface);
      root.style.setProperty("--ustach-ring", theme.ring || theme.primary);
      if (theme.gradient) root.style.setProperty("--ustach-gradient", theme.gradient);
      if (theme.gradientHero) root.style.setProperty("--ustach-gradient-hero", theme.gradientHero);
      if (theme.gradientSoft) root.style.setProperty("--ustach-gradient-soft", theme.gradientSoft);
      if (theme.gradientRing) root.style.setProperty("--ustach-gradient-ring", theme.gradientRing);
      if (theme.accent) root.style.setProperty("--ustach-accent", theme.accent);
      if (theme.glass) {
        root.style.setProperty("--ustach-glass-bg", theme.glass.bg);
        root.style.setProperty("--ustach-glass-border", theme.glass.border);
        root.style.setProperty("--ustach-glass-shadow", theme.glass.shadow);
        root.style.setProperty("--ustach-glass-shadow-hover", theme.glass.shadowHover);
        root.style.setProperty("--ustach-glass-shadow-active", theme.glass.shadowActive);
      }
      if (theme.neumorph) {
        root.style.setProperty("--ustach-neumo-bg", theme.neumorphBg);
        root.style.setProperty("--ustach-neumo-inset-bg", theme.neumorphInsetBg);
        root.style.setProperty("--ustach-neumo-radius", theme.neumorph.radius);
        root.style.setProperty("--ustach-neumo-light", theme.neumorph.light);
        root.style.setProperty("--ustach-neumo-light-hover", theme.neumorph.lightHover);
        root.style.setProperty("--ustach-neumo-inset", theme.neumorph.inset);
        root.style.setProperty("--ustach-neumo-pressed", theme.neumorph.pressed);
        root.style.setProperty("--ustach-neumo-focus", theme.neumorph.focus);
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, mode, custom, toggleTheme, setTheme, setUiColors, resetUiColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}