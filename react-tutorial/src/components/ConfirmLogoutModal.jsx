import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UModal, UButton } from "./ui";

export const ConfirmLogoutModal = ({ open, onConfirm, onCancel }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <UModal open={open} onClose={onCancel} maxWidth={340}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: theme.radius.full,
            backgroundColor: theme.errorLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: theme.raiseMd.boxShadow,
          }}
        >
          <img src="https://api.iconify.design/lucide:log-out.svg?color=%23dc2626" width="26" height="26" alt="" />
        </div>
        <h3 style={{ fontSize: "16px", fontWeight: "800", color: theme.text, margin: 0 }}>{t("logoutConfirmTitle")}</h3>
        <p style={{ fontSize: "13px", color: theme.textSecondary, margin: 0, lineHeight: "1.5" }}>{t("logoutConfirmDesc")}</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "4px", width: "100%" }}>
          <UButton variant="subtle" full onClick={onCancel}>{t("cancel")}</UButton>
          <UButton variant="danger" full onClick={onConfirm}>{t("logout")}</UButton>
        </div>
      </div>
    </UModal>
  );
};

export default ConfirmLogoutModal;