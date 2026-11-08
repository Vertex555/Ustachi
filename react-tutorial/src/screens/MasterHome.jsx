import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { apiUrl, authHeaders } from "../services/api";
import { displayPhone, isGuestPhone, formatWorkingHours, formatPrice } from "../utils/display";
import { ConfirmLogoutModal } from "../components/ConfirmLogoutModal";
import { UCard } from "../components/ui";
import { CheckTypeFixer } from "./CheckTypeFixer";
import { OrdersView } from "./OrdersView";
import { ChatsView } from "./ChatsView";

const MasterProfileView = ({ user, onSettings, onSupport, onLogout, onFeedback, onCards }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [details, setDetails] = useState(null);
  const [photo, setPhoto] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const photoInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/masters/me`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) { setDetails(data.data); if (data.data?.photo) setPhoto(data.data.photo); }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (text, isError = false) => {
    setMsgIsError(isError);
    setStatusMsg(text);
    setTimeout(() => setStatusMsg(""), 2500);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      if (dataUrl && dataUrl.length > 1500000) {
        showMsg(t("photoTooLarge"), true);
        e.target.value = "";
        return;
      }
      setPhoto(dataUrl);
      await savePhoto(dataUrl);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const savePhoto = async (dataUrl) => {
    try {
      const base = details || {};
      const res = await fetch(apiUrl("/api/masters"), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: base.name || user?.name || "",
          phone: base.phone || (user?.phone && !isGuestPhone(user?.phone) ? user?.phone : "") || "",
          experience: base.experience || "",
          devices: base.devices || [],
          location: base.location || undefined,
          price: base.price || 0,
          currency: base.currency || "uzs",
          workingHours: base.workingHours || "",
          photo: dataUrl || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) { setPhoto(data.data?.photo || dataUrl); showMsg(t("profileUpdated")); }
      else showMsg(data.message || t("error"), true);
    } catch { showMsg(t("error"), true); }
  };

  const d = details || {};
  const name = user?.name || d.name || t("master");
  const phone = displayPhone(d.phone || user?.phone, t("guestPhone"));
  const devices = d.devices || [];
  const experience = d.experience;
  const price = d.price;
  const hours = d.workingHours;
  const location = (typeof d.location === "string" ? d.location : d.location?.address) || "";

  const row = (label, value, money) => (
    value ? (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: "13px", color: theme.textSecondary }}>{label}</span>
        <span style={{ fontSize: "13px", fontWeight: "700", color: theme.text, textAlign: "right", paddingLeft: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
          {money && <img src="https://api.iconify.design/lucide:banknote.svg?color=%23059669" alt="" width="15" height="15" />}
          {value}
        </span>
      </div>
    ) : null
  );

  return (
    <div style={{ width: "100%", maxWidth: "100%", margin: "0 auto", padding: "16px", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 16px 0", color: theme.text }}>{t("masterProfile")}</h1>
      <UCard style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
        <div onClick={() => photoInputRef.current && photoInputRef.current.click()} title={t("uploadPhoto")} style={{ width: "76px", height: "76px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: "800", flexShrink: 0, position: "relative", cursor: "pointer" }}>
          {photo ? <img src={photo && (photo.startsWith("data:") || photo.startsWith("http")) ? photo : apiUrl(photo)} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : (name || "M").charAt(0).toUpperCase()}
          <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "26px", height: "26px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.surface}`, boxSizing: "border-box" }}>
            <img src="https://api.iconify.design/lucide:camera.svg?color=%23ffffff" width="13" height="13" alt="" />
          </div>
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 4px 0", color: theme.text }}>{name}</h2>
          <div style={{ fontSize: "13px", color: theme.textSecondary }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><img src={`https://api.iconify.design/lucide:phone.svg?color=${encodeURIComponent(theme.textSecondary)}`} width="14" height="14" alt="" />{phone || t("guestPhone")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:star.svg?color=%23059669&fill=%23059669" width="14" height="14" alt="" />{user?.rating ?? d.rating ?? 0}</div>
          </div>
        </div>
      </UCard>

      {statusMsg && (
        <div style={{ padding: "12px 14px", borderRadius: theme.radius.md, fontSize: "13px", fontWeight: "700", textAlign: "center", marginTop: "12px", backgroundColor: msgIsError ? theme.errorLight : theme.successLight, color: msgIsError ? theme.error : theme.success, border: `1px solid ${msgIsError ? theme.error : "transparent"}` }}>
          {statusMsg}
        </div>
      )}

      {(devices.length > 0 || experience || price || hours || location) && (
        <UCard style={{ padding: "16px 18px", marginTop: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "800", color: theme.text, margin: "0 0 4px 0" }}>{t("anketaData")}</h3>
          {row(t("masterExperience"), experience ? `${experience}+ ${t("masterYears")}` : null)}
          {row(t("masterDevices"), devices.length ? devices.join(", ") : null)}
          {row(t("masterPrice"), price ? formatPrice(price, d.currency) : null, true)}
          {row(t("masterHours"), hours ? formatWorkingHours(hours) : null)}
          {row(t("masterLocationLabel"), location)}
        </UCard>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
        {[
          { label: t("myCards"), icon: "credit-card", action: onCards },
          { label: t("settings"), icon: "settings", action: onSettings },
          { label: t("helpSupport"), icon: "life-buoy", action: onSupport },
          { label: t("feedback"), icon: "message-square", action: onFeedback },
        ].filter((it) => it.action).map((it) => (
          <UCard key={it.label} onClick={it.action} hover style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px" }}>
            <img src={`https://api.iconify.design/lucide:${it.icon}.svg?color=${encodeURIComponent(theme.textSecondary)}`} width="20" height="20" alt="" />
            <span style={{ flex: 1, textAlign: "left", fontSize: "14px", fontWeight: "600", color: theme.text }}>{it.label}</span>
            <img src="https://api.iconify.design/lucide:chevron-right.svg?color=%2394a3b8" width="18" height="18" alt="" />
          </UCard>
        ))}
        <UCard onClick={() => setConfirmLogout(true)} hover style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", border: `1px solid ${theme.errorLight}` }}>
          <img src="https://api.iconify.design/lucide:log-out.svg?color=%23dc2626" width="20" height="20" alt="" />
          <span style={{ flex: 1, textAlign: "left", fontSize: "14px", fontWeight: "700", color: theme.error }}>{t("logout")}</span>
        </UCard>
      </div>

      <ConfirmLogoutModal
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => { setConfirmLogout(false); onLogout(); }}
      />
    </div>
  );
};

export const MasterHome = ({
  user,
  tab,
  setTab,
  onSaveProfile,
  onChangeRole,
  onOpenSettings,
  onOpenOrder,
  onOpenChat,
  onLogout,
  onSupport,
  onOpenFeedback,
  onOpenCards,
  badges,
  onBadgeRefresh,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  let content;
  if (tab === "anketa") {
    content = (
      <CheckTypeFixer
        onSaveProfile={onSaveProfile}
        onChangeRole={onChangeRole}
        onOpenSettings={onOpenSettings}
      />
    );
  } else if (tab === "orders") {
    content = <OrdersView user={user} onViewOrder={onOpenOrder} onBadgeRefresh={onBadgeRefresh} />;
  } else if (tab === "chats") {
    content = <ChatsView user={user} onOpenChat={onOpenChat} onBadgeRefresh={onBadgeRefresh} />;
  } else {
    content = (
      <MasterProfileView
        user={user}
        onSettings={onOpenSettings}
        onSupport={onSupport}
        onLogout={onLogout}
        onFeedback={onOpenFeedback}
        onCards={onOpenCards}
      />
    );
  }

  return (
    <div key={tab} className="ust-screen-up ust-tab-right" style={{ flex: 1, minHeight: "100vh", overflowY: "auto", backgroundColor: "transparent", color: theme.text, fontFamily: theme.font.family }}>
      {content}
    </div>
  );
};

export default MasterHome;