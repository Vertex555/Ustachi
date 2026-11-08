import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UButton, UCard } from "../components/ui";
import uploadingSvg from "../animations/Uploading.svg";
import userProfileSvg from "../animations/User Profile.svg";
import successSvg from "../animations/Success.gif";

export const Onboarding2 = ({ onNext }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const steps = [
    {
      icon: uploadingSvg,
      number: "1",
      title: t("ob2Step1Title"),
      desc: t("ob2Step1Desc"),
      isGif: false,
    },
    {
      icon: userProfileSvg,
      number: "2",
      title: t("ob2Step2Title"),
      desc: t("ob2Step2Desc"),
      isGif: false,
    },
    {
      icon: successSvg,
      number: "3",
      title: t("ob2Step3Title"),
      desc: t("ob2Step3Desc"),
      isGif: false,
    },
  ];

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
      gap: "28px"
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <h2 style={{ fontSize: theme.font.xxxl, fontWeight: theme.font.extrabold, margin: "0 0 6px 0", color: theme.text, letterSpacing: "-0.5px" }}>
          {t("ob2Title")}
        </h2>
        <p style={{ fontSize: theme.font.base, color: theme.textSecondary, margin: 0, lineHeight: "1.4", fontWeight: theme.font.semibold }}>
          {t("ob2Subtitle")}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "380px", textAlign: "left" }}>
        {steps.map((step, index) => (
          <UCard key={index} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 16px" }}>
            <div style={{
              width: "52px",
              height: "52px",
              borderRadius: theme.radius.md,
              backgroundColor: theme.successLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
              padding: "10px"
            }}>
              <img
                src={step.icon}
                alt={step.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter: "brightness(0) saturate(100%) invert(34%) sepia(85%) saturate(464%) hue-rotate(85deg) brightness(94%) contrast(93%)"
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: theme.font.extrabold, color: theme.primary, fontSize: theme.font.md }}>
                  {step.number}
                </span>
                <h3 style={{ fontWeight: theme.font.bold, color: theme.text, fontSize: theme.font.md, margin: 0 }}>
                  {step.title}
                </h3>
              </div>
              <p style={{ fontSize: theme.font.sm, color: theme.textSecondary, marginTop: "4px", marginBottom: 0, lineHeight: "1.3" }}>
                {step.desc}
              </p>
            </div>
          </UCard>
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "4px", backgroundColor: theme.border }}></div>
          <div style={{ width: "24px", height: "8px", borderRadius: "4px", backgroundColor: theme.primary }}></div>
          <div style={{ width: "8px", height: "8px", borderRadius: "4px", backgroundColor: theme.border }}></div>
        </div>

        <UButton onClick={onNext} full size="lg">
          {t("onboardingNext")}
        </UButton>
      </div>
    </div>
  );
};