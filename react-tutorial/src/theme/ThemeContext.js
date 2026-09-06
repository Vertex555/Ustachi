import React, { createContext, useContext, useState, useEffect } from "react";
import { light, dark } from "./tokens";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem("ustachi_theme") || "light";
    } catch {
      return "light";
    }
  });

  const theme = mode === "dark" ? dark : light;

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
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}