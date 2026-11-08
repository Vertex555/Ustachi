import React, { useState, useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UButton, UCard } from "../components/ui";
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
      <UCard style={{
        width: "100%",
        maxWidth: "380px",
        margin: "0 auto",
        padding: `${theme.spacing.xxxl} ${theme.spacing.xxl}`,
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
            {t("noInternetTitle")}
          </h1>
          <p style={{ fontSize: theme.font.sm, color: theme.textSecondary, margin: 0, lineHeight: "1.5" }}>
            {t("noInternetDesc")}
          </p>
        </div>

        <UButton onClick={handleManualRetry} disabled={isRetrying} loading={isRetrying} full>
          {isRetrying ? t("checking") : t("retry")}
        </UButton>
      </UCard>
    </div>
  );
};