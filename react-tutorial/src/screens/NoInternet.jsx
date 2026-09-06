import React, { useState, useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import noConnectionAnim from "../animations/nointernet.svg";

export const NoInternet = ({ onRetry }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [onRetry]);

  const handleManualRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (navigator.onLine) {
        if (onRetry) {
          onRetry();
        } else {
          window.location.reload();
        }
      } else {
        setIsRetrying(false);
      }
    }, 800);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      padding: theme.spacing.xl,
      backgroundColor: theme.bgSecondary,
      fontFamily: theme.font.family,
      boxSizing: "border-box",
      width: "100%"
    }}>
      <div style={{
        backgroundColor: theme.surface,
        padding: `${theme.spacing.xxxl} ${theme.spacing.xxl}`,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadowMd,
        width: "100%",
        maxWidth: "380px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        textAlign: "center",
        boxSizing: "border-box"
      }}>
        <div style={{
          width: "200px",
          height: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <img
            src={noConnectionAnim}
            alt="No internet connection"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h1 style={{ fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.text, margin: 0 }}>
            Internet aloqasi yo'q
          </h1>
          <p style={{ fontSize: theme.font.sm, color: theme.textSecondary, margin: 0, lineHeight: "1.5" }}>
            Iltimos, internet tarmog'iga ulanganingizni tekshiring va qaytadan urinib ko'ring.
          </p>
        </div>

        <button
          onClick={handleManualRetry}
          disabled={isRetrying}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "14px 16px",
            borderRadius: theme.radius.md,
            border: "none",
            backgroundColor: theme.primary,
            color: theme.textInverse,
            fontSize: theme.font.md,
            fontWeight: theme.font.bold,
            cursor: isRetrying ? "not-allowed" : "pointer",
            opacity: isRetrying ? 0.7 : 1,
            transition: theme.transition.normal,
            boxSizing: "border-box",
            boxShadow: `0 4px 10px ${theme.mode === "dark" ? "rgba(16,185,129,0.3)" : "rgba(46,125,50,0.3)"}`
          }}
          onMouseOver={(e) => { if (!isRetrying) e.currentTarget.style.backgroundColor = theme.primaryHover; }}
          onMouseOut={(e) => { if (!isRetrying) e.currentTarget.style.backgroundColor = theme.primary; }}
        >
          {isRetrying ? "Tekshirilmoqda..." : t("retry")}
        </button>
      </div>
    </div>
  );
};
