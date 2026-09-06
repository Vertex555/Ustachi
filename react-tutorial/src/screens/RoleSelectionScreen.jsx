import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";

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
      <div style={{
        backgroundColor: theme.surface,
        padding: `${theme.spacing.xxl} ${theme.spacing.xl}`,
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
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            disabled={!!loading}
            aria-label={t("back")}
            style={{ background: "none", border: "none", cursor: loading ? "wait" : "pointer", alignSelf: "flex-start", color: theme.text, padding: "4px" }}
          >
            <ChevronLeft size={26} />
          </button>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{ backgroundColor: theme.primary, width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 10px ${theme.mode === "dark" ? "rgba(16,185,129,0.3)" : "rgba(46,125,50,0.3)"}` }}>
            <img src="https://api.iconify.design/lucide:wrench.svg?color=%23ffffff" alt="logo" width="26" height="26" />
          </div>
          <h1 style={{ fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.primary, margin: 0 }}>Ustachi</h1>
          <p style={{ fontSize: theme.font.sm, color: theme.textSecondary, margin: 0 }}>Davom etish uchun o'z rolingizni tanlang</p>
          {error && <p style={{ fontSize: theme.font.xs, color: theme.error, fontWeight: theme.font.bold, margin: 0 }}>{error}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>

          <button
            onClick={() => pick("user")}
            disabled={!!loading}
            style={{
              display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", borderRadius: theme.radius.md,
              border: `2px solid ${theme.border}`, backgroundColor: theme.surfaceHover, cursor: loading ? "wait" : "pointer",
              transition: theme.transition.normal, width: "100%", textAlign: "left", boxSizing: "border-box"
            }}
          >
            <div style={{ backgroundColor: theme.successLight, padding: "10px", borderRadius: theme.radius.sm, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="https://api.iconify.design/lucide:user.svg?color=%232e7d32" alt="user" width="24" height="24" />
            </div>
            <div>
              <h3 style={{ fontSize: theme.font.md, fontWeight: theme.font.extrabold, color: theme.text, margin: "0 0 2px 0" }}>Foydalanuvchi</h3>
              <p style={{ fontSize: theme.font.xs, color: theme.textSecondary, margin: 0 }}>Qurilmamni ta'mirlatish uchun usta qidiraman</p>
            </div>
          </button>

          <button
            onClick={() => pick("master")}
            disabled={!!loading}
            style={{
              display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", borderRadius: theme.radius.md,
              border: `2px solid ${theme.border}`, backgroundColor: theme.surfaceHover, cursor: loading ? "wait" : "pointer",
              transition: theme.transition.normal, width: "100%", textAlign: "left", boxSizing: "border-box"
            }}
          >
            <div style={{ backgroundColor: theme.successLight, padding: "10px", borderRadius: theme.radius.sm, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="https://api.iconify.design/lucide:hammer.svg?color=%232e7d32" alt="master" width="24" height="24" />
            </div>
            <div>
              <h3 style={{ fontSize: theme.font.md, fontWeight: theme.font.extrabold, color: theme.text, margin: "0 0 2px 0" }}>Usta</h3>
              <p style={{ fontSize: theme.font.xs, color: theme.textSecondary, margin: 0 }}>Buyurtmalarni ko'rib chiqish va qabul qilish</p>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
};

export default RoleSelectionScreen;
