import React from "react";
import { ChevronLeft, Globe, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";

export const SettingsScreen = ({ onBack, onLogout }) => {
  const { theme, mode, toggleTheme } = useTheme();
  const { t, lang, changeLang, languages } = useTranslation();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: theme.font.family,
      boxSizing: "border-box"
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "16px 20px",
        backgroundColor: theme.surface,
        borderBottom: `1px solid ${theme.border}`
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: theme.text, display: "flex" }}>
          <ChevronLeft size={26} />
        </button>
        <h1 style={{ fontSize: theme.font.lg, fontWeight: theme.font.extrabold, margin: 0 }}>{t("settings")}</h1>
      </div>

      <div style={{ padding: "20px", maxWidth: "800px", width: "100%", margin: "0 auto" }}>
        {/* Til */}
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          marginBottom: "16px",
          boxShadow: theme.shadowSm
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <Globe size={18} color={theme.primary} />
            <span style={{ fontSize: theme.font.base, fontWeight: theme.font.semibold }}>{t("language")}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => changeLang(l.code)}
                style={{
                  flex: 1, minWidth: "90px",
                  padding: "10px 12px",
                  borderRadius: theme.radius.md,
                  border: lang === l.code ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                  backgroundColor: lang === l.code ? theme.primaryLight : theme.surface,
                  color: lang === l.code ? theme.primary : theme.textSecondary,
                  fontWeight: theme.font.bold,
                  fontSize: theme.font.sm,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  transition: theme.transition.normal
                }}
              >
                <img src={l.flagSvg} alt={l.label} width="20" height="20" style={{ borderRadius: "50%" }} /> {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mavzu */}
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          marginBottom: "16px",
          boxShadow: theme.shadowSm
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {mode === "dark" ? <Moon size={18} color={theme.primary} /> : <Sun size={18} color={theme.primary} />}
              <span style={{ fontSize: theme.font.base, fontWeight: theme.font.semibold }}>
                {mode === "dark" ? t("darkMode") : t("lightMode")}
              </span>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                width: "52px", height: "28px",
                borderRadius: theme.radius.full,
                border: "none",
                backgroundColor: mode === "dark" ? theme.primary : theme.border,
                position: "relative",
                cursor: "pointer",
                transition: theme.transition.normal
              }}
            >
              <div style={{
                width: "22px", height: "22px",
                borderRadius: "50%",
                backgroundColor: "#fff",
                position: "absolute",
                top: "3px",
                left: mode === "dark" ? "27px" : "3px",
                transition: theme.transition.normal,
                boxShadow: theme.shadowSm
              }} />
            </button>
          </div>
        </div>

        {/* Chiqish */}
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.error}`,
              backgroundColor: theme.errorLight,
              color: theme.error,
              fontWeight: theme.font.bold,
              fontSize: theme.font.base,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: theme.transition.normal
            }}
          >
            <LogOut size={18} /> {t("logout")}
          </button>
        )}
      </div>
    </div>
  );
};

export default SettingsScreen;