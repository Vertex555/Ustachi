import React from "react";
import { Globe, Moon, Sun, CheckCircle2 } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UBackBtn, UButton } from "../components/ui";

export const SettingsScreen = ({ onBack }) => {
  const { theme, mode, toggleTheme } = useTheme();
  const { t, lang, changeLang, languages } = useTranslation();

  const cardBase = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: "16px",
    boxShadow: theme.raiseMd.boxShadow,
  };

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
        backgroundColor: theme.bg,
      }}>
        <UBackBtn onClick={onBack} />
        <h1 style={{ fontSize: theme.font.lg, fontWeight: theme.font.extrabold, margin: 0 }}>{t("settings")}</h1>
      </div>

      <div style={{ padding: "clamp(12px, 3vw, 24px)", maxWidth: "600px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {/* Til */}
        <div style={cardBase}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <Globe size={18} color={theme.primary} />
            <span style={{ fontSize: theme.font.base, fontWeight: theme.font.semibold }}>{t("language")}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {languages.map((l) => (
              <UButton
                key={l.code}
                full
                variant={lang === l.code ? "primary" : "subtle"}
                onClick={() => changeLang(l.code)}
                style={{ justifyContent: "flex-start", flex: "1 1 140px", minHeight: "48px" }}
              >
                <img src={l.flagUrl} alt={l.code} width="20" height="20" style={{ borderRadius: "50%", pointerEvents: "none" }} />
                <span>{l.label}</span>
                {lang === l.code && (
                  <CheckCircle2
                    size={16}
                    className="ust-pop"
                    style={{ marginLeft: "auto", flexShrink: 0 }}
                  />
                )}
              </UButton>
            ))}
          </div>
        </div>

        {/* Mavzu */}
        <div style={cardBase}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {mode === "dark" ? <Moon size={18} color={theme.primary} /> : <Sun size={18} color={theme.primary} />}
              <span style={{ fontSize: theme.font.base, fontWeight: theme.font.semibold }}>
                {mode === "dark" ? t("darkMode") : t("lightMode")}
              </span>
            </div>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="ust-theme-toggle"
              style={{
                width: "60px", height: "32px",
                borderRadius: theme.radius.full,
                border: `1px solid ${theme.border}`,
                backgroundColor: mode === "dark" ? theme.primary : "rgba(100,116,139,0.32)",
                position: "relative",
                cursor: "pointer",
                transition: "background-color .3s ease, transform .15s ease, box-shadow .3s ease",
                boxShadow: mode === "dark"
                  ? `0 0 18px ${theme.primaryLight}, ${theme.raiseSm.boxShadow}`
                  : theme.raiseSm.boxShadow,
              }}
            >
              {/* Track ichidagi sun/moon belgilari */}
              <Sun size={13} style={{ position: "absolute", top: "9px", left: "8px", color: mode === "dark" ? "rgba(255,255,255,0.55)" : "#fff", pointerEvents: "none" }} />
              <Moon size={13} style={{ position: "absolute", top: "9px", right: "8px", color: "#fff", pointerEvents: "none" }} />
              {/* Siljiydigan tugmacha */}
              <div className="ust-toggle-knob" style={{
                width: "26px", height: "26px",
                borderRadius: theme.radius.full,
                backgroundColor: theme.surface,
                boxShadow: theme.shadowSm,
                position: "absolute",
                top: "3px",
                left: mode === "dark" ? "31px" : "3px",
                transition: "left .3s cubic-bezier(.34,1.56,.64,1), transform .15s ease",
                boxShadow: "0 2px 6px rgba(15,23,42,0.25), 0 0 0 1px rgba(255,255,255,0.35) inset",
              }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;