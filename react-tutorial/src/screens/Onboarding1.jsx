import React from "react";
import { Wrench } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UButton } from "../components/ui";
import phoneRepairSvg from "../animations/Phone Repair.svg";

export const Onboarding1 = ({ onNext }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      maxHeight: "100vh",
      padding: theme.spacing.xxl,
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: theme.font.family,
      boxSizing: "border-box",
      textAlign: "center",
      overflow: "hidden",
      gap: "36px"
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", width: "100%", maxWidth: "380px" }}>
        <div style={{
          backgroundColor: theme.primary,
          width: "78px",
          height: "78px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...theme.raiseMd,
          transition: theme.transition.normal,
        }}>
          <Wrench size="38px" color={theme.textInverse} style={{ transform: "rotate(-45deg)" }} />
        </div>
        
        <div>
          <h1 style={{
            fontSize: theme.font.xxxl,
            fontWeight: theme.font.extrabold,
            margin: "0 0 6px 0",
            color: theme.primary,
            letterSpacing: "-0.5px"
          }}>
            Ustachi
          </h1>
          <p style={{
            fontSize: theme.font.base,
            color: theme.textSecondary,
            margin: "0 auto",
            maxWidth: "280px",
            fontWeight: theme.font.semibold,
            lineHeight: "1.5"
          }}>
            {t("onboardingDesc")}
          </p>
        </div>

        <div style={{
          width: "100%",
          maxWidth: "320px",
          height: "210px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.bg
        }}>
          <img src={phoneRepairSvg} alt="Phone Repair" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
          <div style={{ width: "24px", height: "8px", borderRadius: "4px", backgroundColor: theme.primary }}></div>
          <div style={{ width: "8px", height: "8px", borderRadius: "4px", backgroundColor: theme.border }}></div>
          <div style={{ width: "8px", height: "8px", borderRadius: "4px", backgroundColor: theme.border }}></div>
        </div>

        <UButton onClick={onNext} full size="lg">
          {t("getStarted")}
        </UButton>

        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
          fontSize: theme.font.sm,
          color: theme.textTertiary,
          fontWeight: theme.font.bold
        }}>
          <span>Trusted</span>
          <span>•</span>
          <span>Fast</span>
          <span>•</span>
          <span>Nearby</span>
        </div>
      </div>
    </div>
  );
};