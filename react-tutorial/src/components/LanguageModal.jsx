import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { Check } from "lucide-react";
import { UCard } from "./ui";

// Dastur ochilganda tilni so'raydigan modal.
export const LanguageModal = ({ onDone }) => {
  const { theme } = useTheme();
  const { languages, lang, changeLang, t } = useTranslation();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.overlay || "rgba(0,0,0,0.45)",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="ust-scale"
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius.xl,
          boxShadow: theme.raiseXl.boxShadow,
          fontFamily: theme.font.family,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div style={{ height: "6px", background: theme.primary }} />
        <div style={{ padding: "22px 22px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "4px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: theme.primary,
                color: theme.textInverse,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto",
                boxShadow: theme.raiseMd.boxShadow,
              }}
            >
              <img src="https://api.iconify.design/lucide:languages.svg?color=%23ffffff" width="26" height="26" alt="" />
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: theme.font.xl, fontWeight: "800", color: theme.text }}>
              {t("lmTitle")}
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: "13px", color: theme.textSecondary }}>{t("lmSubtitle")}</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {languages.map((l) => {
              const active = l.code === lang;
              return (
                <UCard
                  key={l.code}
                  onClick={() => { changeLang(l.code); if (onDone) onDone(); }}
                  raised={!active}
                  pressed={active}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    cursor: "pointer",
                    border: active ? `1.5px solid ${theme.primary}` : `1px solid ${theme.border}`,
                    background: active ? theme.primaryLight : theme.surface,
                  }}
                >
                  <img src={l.flagUrl} alt={l.code} width="30" height="30" style={{ borderRadius: "50%", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: "15px", fontWeight: "700", color: theme.text }}>{l.name}</span>
                  {active && (
                    <span
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        backgroundColor: theme.primary,
                        color: theme.textInverse,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: theme.raiseSm.boxShadow,
                      }}
                    >
                      <Check size={15} />
                    </span>
                  )}
                </UCard>
              );
            })}
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "10px 12px",
              borderRadius: theme.radius.md,
              backgroundColor: theme.bgSecondary,
              border: `1px dashed ${theme.border}`,
              fontSize: "12px",
              color: theme.textSecondary,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            {t("lmNote")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageModal;