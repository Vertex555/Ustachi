import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import NotificationsBell from "./NotificationsBell";

// Bosh ekrandagi tez harakatlar klasteri: narx kalkulyatori, promo va bildirishnoma.
// Desktop'da yuqori o'ng burchakda, telefonda suzuvchi FAB sifatida.
export const AppQuickActions = ({ onOpen }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const g = theme.glass || {};

  const chip = (key, icon, label) => (
    <button
      key={key}
      type="button"
      onClick={() => onOpen && onOpen(key)}
      title={label}
      aria-label={label}
      className="ust-qa-btn"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "7px",
        height: "42px",
        padding: "0 14px",
        borderRadius: "999px",
        border: `1px solid ${g.border || theme.border}`,
        background: g.bg || theme.surface,
        color: theme.text,
        cursor: "pointer",
        boxShadow: theme.raiseSm ? theme.raiseSm.boxShadow : undefined,
        backdropFilter: "blur(14px) saturate(1.3)",
        WebkitBackdropFilter: "blur(14px) saturate(1.3)",
        fontFamily: theme.font.family,
        fontSize: theme.font.sm,
        fontWeight: theme.font.bold,
        transition: "transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = theme.raiseMd ? theme.raiseMd.boxShadow : undefined;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = theme.raiseSm ? theme.raiseSm.boxShadow : undefined;
      }}
    >
      <img
        src={`https://api.iconify.design/lucide:${icon}.svg?color=${encodeURIComponent(theme.primary)}`}
        width="17"
        height="17"
        alt=""
        style={{ flexShrink: 0 }}
      />
      <span className="ust-qa-label">{label}</span>
    </button>
  );

  return (
    <div
      className="ust-quick-actions"
      style={{ display: "flex", alignItems: "center", gap: "8px" }}
    >
      {chip("calculator", "calculator", t("calcShort") || "Kalkulyator")}
      {chip("promo", "gift", t("navPromo") || "Promo")}
      <NotificationsBell onOpenAll={(n) => onOpen && onOpen("notifications", n)} />
    </div>
  );
};

export default AppQuickActions;
