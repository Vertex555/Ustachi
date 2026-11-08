import React, { useState, useEffect, useCallback } from "react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { formatWorkingHours, displayPhone, formatPrice } from "../utils/display";
import { ReviewsSection } from "../components/ReviewsSection";

export const MasterProfileScreen = ({ master, masterId: masterIdProp, onBack, onOrder, onChat }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(master || null);

  const load = useCallback(async () => {
    const id = master?.id || master?._id || masterIdProp;
    if (!id) return;
    try {
      const res = await fetch(apiUrl(`/api/masters/${id}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && data.data) setProfile(data.data);
    } catch {}
  }, [master?.id, master?._id, masterIdProp]);

  useEffect(() => { load(); }, [load]);

  const d = profile || {};
  const name = d.name || t("master");

  const row = (label, value, money) =>
    value ? (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: "13px", color: theme.textSecondary }}>{label}</span>
        <span style={{ fontSize: "13px", fontWeight: "700", color: theme.text, textAlign: "right", paddingLeft: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
          {money && <img src="https://api.iconify.design/lucide:banknote.svg?color=%23059669" alt="" width="15" height="15" />}
          {value}
        </span>
      </div>
    ) : null;

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: "100vh", backgroundColor: theme.bg }}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%", maxWidth: "100%", backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family, boxSizing: "border-box", padding: "20px 16px", position: "relative", boxShadow: "0 0 20px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <button onClick={onBack} aria-label={t("back")}
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: theme.text, fontSize: "18px", fontWeight: "bold", boxShadow: theme.shadowSm }}><img src={`https://api.iconify.design/lucide:chevron-left.svg?color=${encodeURIComponent(theme.text)}`} width="18" height="18" alt="" /></button>
          <h1 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: theme.text }}>{t("masterProfile")}</h1>
        </div>

        <div style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.lg, padding: "20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: theme.shadowSm }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: "800", overflow: "hidden", flexShrink: 0 }}>
            {d.photo ? <img src={d.photo && (d.photo.startsWith("data:") || d.photo.startsWith("http")) ? d.photo : apiUrl(d.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (name || "M").charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 4px 0", color: theme.text }}>{name}</h2>
            <div style={{ fontSize: "13px", color: theme.textSecondary, display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><img src={`https://api.iconify.design/lucide:phone.svg?color=${encodeURIComponent(theme.textSecondary)}`} width="14" height="14" alt="" />{displayPhone(d.phone, t("guestPhone"))}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:star.svg?color=%23059669&fill=%23059669" width="14" height="14" alt="" />{d.rating ?? 0}{d.reviewsCount ? ` (${d.reviewsCount})` : ""}</div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.lg, padding: "16px 18px", marginTop: "16px", boxShadow: theme.shadowSm }}>
          <h3 style={{ fontSize: "14px", fontWeight: "800", color: theme.text, margin: "0 0 8px 0" }}>{t("anketaData")}</h3>
          {row(t("masterExperience"), d.experience ? `${d.experience}+ ${t("masterYears")}` : null)}
          {row(t("masterDevices"), (d.devices || []).length ? d.devices.join(", ") : null)}
          {row(t("masterPrice"), d.price ? formatPrice(d.price, d.currency) : null, true)}
          {row(t("masterHours"), d.workingHours ? formatWorkingHours(d.workingHours) : null)}
          {row(t("masterLocationLabel"), (typeof d.location === "string" ? d.location : d.location?.address))}
        </div>

        {/* Reyting va sharhlar (haqiqiy backend'dan) */}
        {(d.id || d._id || masterIdProp) && (
          <ReviewsSection
            masterId={d.id || d._id || masterIdProp}
            style={{ marginTop: "16px" }}
          />
        )}

        <div style={{ display: "flex", gap: "12px", marginTop: "auto", paddingTop: "20px" }}>
          {onChat && (
            <button onClick={() => onChat(d)} className="custom-btn"
              style={{ flex: 1, backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", color: theme.text }}>
              <img src="https://api.iconify.design/lucide:message-circle.svg?color=%23111111" alt="" width="18" height="18" />
              {t("chat")}
            </button>
          )}
          <button onClick={() => onOrder && onOrder(d)} className="custom-btn"
            style={{ flex: 2, backgroundColor: theme.primary, color: theme.textInverse, border: "none", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: "800", cursor: "pointer" }}>
            {t("orderNow")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterProfileScreen;


