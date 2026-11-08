import React, { useState } from "react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UBackBtn, UCard } from "../components/ui";

export const RoleSelectionScreen = ({ onSelectRole, onBackToHome }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(null);

  const pick = async (role) => {
    if (loading) return;
    setLoading(role);
    setError("");

    try {
      const response = await fetch(apiUrl("/api/users/me"), {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ role })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Rolni yangilashda xatolik");

      if (data.user?.role !== role) {
        throw new Error(data.message || "Rolni o'zgartirib bo'lmadi");
      }

      onSelectRole(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      padding: theme.spacing.lg,
      backgroundColor: theme.bgSecondary,
      fontFamily: theme.font.family,
      boxSizing: "border-box",
      width: "100%"
    }}>
      <UCard style={{
        width: "100%",
        maxWidth: "380px",
        margin: "0 auto",
        padding: `${theme.spacing.xxl} ${theme.spacing.xl}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        textAlign: "center",
        boxSizing: "border-box"
      }}>
        {onBackToHome && (
          <div style={{ alignSelf: "flex-start", display: "flex", justifyContent: "flex-start" }}>
            <UBackBtn onClick={onBackToHome} disabled={!!loading} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{ backgroundColor: theme.primary, width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: theme.raiseMd.boxShadow, transition: theme.transition.normal }}>
            <img src="https://api.iconify.design/lucide:wrench.svg?color=%23ffffff" alt="logo" width="26" height="26" />
          </div>
          <h1 style={{ fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.primary, margin: 0 }}>Ustachi</h1>
          <p style={{ fontSize: theme.font.sm, color: theme.textSecondary, margin: 0 }}>{t("rsDesc")}</p>
          {error && <p style={{ fontSize: theme.font.xs, color: theme.error, fontWeight: theme.font.bold, margin: 0 }}>{error}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
          <UCard
            raised={!loading}
            pressed={!!loading}
            hover={!loading}
            onClick={() => pick("user")}
            style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", textAlign: "left", boxSizing: "border-box", opacity: loading && loading !== "user" ? 0.5 : 1 }}
          >
            <div style={{ backgroundColor: theme.successLight, padding: "10px", borderRadius: theme.radius.sm, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="https://api.iconify.design/lucide:user.svg?color=%232e7d32" alt="user" width="24" height="24" />
            </div>
            <div>
              <h3 style={{ fontSize: theme.font.md, fontWeight: theme.font.extrabold, color: theme.text, margin: "0 0 2px 0" }}>{t("roleUser")}</h3>
              <p style={{ fontSize: theme.font.xs, color: theme.textSecondary, margin: 0 }}>{t("roleUserDesc")}</p>
            </div>
          </UCard>

          <UCard
            raised={!loading}
            pressed={!!loading}
            hover={!loading}
            onClick={() => pick("master")}
            style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", textAlign: "left", boxSizing: "border-box", opacity: loading && loading !== "master" ? 0.5 : 1 }}
          >
            <div style={{ backgroundColor: theme.successLight, padding: "10px", borderRadius: theme.radius.sm, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="https://api.iconify.design/lucide:hammer.svg?color=%232e7d32" alt="master" width="24" height="24" />
            </div>
            <div>
              <h3 style={{ fontSize: theme.font.md, fontWeight: theme.font.extrabold, color: theme.text, margin: "0 0 2px 0" }}>{t("roleMaster")}</h3>
              <p style={{ fontSize: theme.font.xs, color: theme.textSecondary, margin: 0 }}>{t("roleMasterDesc")}</p>
            </div>
          </UCard>
        </div>
      </UCard>
    </div>
  );
};

export default RoleSelectionScreen;