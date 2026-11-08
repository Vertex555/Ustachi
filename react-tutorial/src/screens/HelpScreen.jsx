import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UBackBtn, UCard } from "../components/ui";

export const HelpScreen = ({ onBack, viewerRole }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const isMaster = viewerRole === "master";

  const steps = isMaster
    ? [
        { num: 1, title: t("mhelpStep1Title"), desc: t("mhelpStep1Desc"), icon: "lucide:user-check.svg?color=%23059669" },
        { num: 2, title: t("mhelpStep2Title"), desc: t("mhelpStep2Desc"), icon: "lucide:clipboard-list.svg?color=%23059669" },
        { num: 3, title: t("mhelpStep3Title"), desc: t("mhelpStep3Desc"), icon: "lucide:bell-ring.svg?color=%23059669" },
        { num: 4, title: t("mhelpStep4Title"), desc: t("mhelpStep4Desc"), icon: "lucide:check-circle.svg?color=%23059669" },
        { num: 5, title: t("mhelpStep5Title"), desc: t("mhelpStep5Desc"), icon: "lucide:message-circle.svg?color=%23059669" },
        { num: 6, title: t("mhelpStep6Title"), desc: t("mhelpStep6Desc"), icon: "lucide:star.svg?color=%23059669" },
      ]
    : [
        { num: 1, title: t("helpStep1Title"), desc: t("helpStep1Desc"), icon: "lucide:smartphone.svg?color=%23059669" },
        { num: 2, title: t("helpStep2Title"), desc: t("helpStep2Desc"), icon: "lucide:alert-circle.svg?color=%23059669" },
        { num: 3, title: t("helpStep3Title"), desc: t("helpStep3Desc"), icon: "lucide:map-pin.svg?color=%23059669" },
        { num: 4, title: t("helpStep4Title"), desc: t("helpStep4Desc"), icon: "lucide:shopping-cart.svg?color=%23059669" },
        { num: 5, title: t("helpStep5Title"), desc: t("helpStep5Desc"), icon: "lucide:map.svg?color=%23059669" },
        { num: 6, title: t("helpStep6Title"), desc: t("helpStep6Desc"), icon: "lucide:star.svg?color=%23059669" },
      ];

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: "100vh", backgroundColor: theme.bg }}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%", maxWidth: "100%", backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family, boxSizing: "border-box", padding: "24px 20px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <UBackBtn onClick={onBack} />
          <h1 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: theme.text }}>{t("helpTitle")}</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {steps.map((step) => (
            <UCard key={step.num} style={{ padding: "16px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: theme.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={`https://api.iconify.design/${step.icon}`} width="22" height="22" alt="" />
              </div>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: "800", color: theme.text, margin: "0 0 4px 0" }}>{step.title}</h3>
                <p style={{ fontSize: "13px", color: theme.textSecondary, margin: 0, lineHeight: "1.4" }}>{step.desc}</p>
              </div>
            </UCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HelpScreen;


