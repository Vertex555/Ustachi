import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { apiUrl, authHeaders } from "../services/api";
import { fetchSavedMasters } from "../services/savedMasters";
import { attachSocket } from "../services/socket";
import { CheckTypeFixer } from "./CheckTypeFixer";
import { OrdersView } from "./OrdersView";
import { ChatsView } from "./ChatsView";

const TABS = [
  { key: "anketa", icon: "clipboard-list", label: "anketa", badgeKey: null },
  { key: "orders", icon: "package", label: "orders", badgeKey: "orders" },
  { key: "chats", icon: "message-circle", label: "chats", badgeKey: "chats" },
  { key: "profile", icon: "user", label: "profile", badgeKey: null },
];

const ACTIVE_ORDER_STATUSES = ["placed", "accepted", "in_progress", "ready"];

const MasterProfileView = ({ user, onSettings, onSupport, onLogout }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [details, setDetails] = useState(null);
  const [photo, setPhoto] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);
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
          phone: base.phone || user?.phone || "",
          experience: base.experience || "",
          devices: base.devices || [],
          location: base.location || undefined,
          price: base.price || 0,
          workingHours: base.workingHours || "",
          bankCard: base.bankCard || "",
          cardholderName: base.cardholderName || "",
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
  const phone = user?.phone || d.phone || "";
  const devices = d.devices || [];
  const experience = d.experience;
  const price = d.price;
  const hours = d.workingHours;
  const location = (typeof d.location === "string" ? d.location : d.location?.address) || "";
  const bankName = d.cardholderName || "";
  const card = d.bankCard || "";

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
    <div style={{ width: "100%", padding: "16px", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 16px 0", color: theme.text }}>{t("masterProfile")}</h1>
      <div style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.lg, padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
        <div onClick={() => photoInputRef.current && photoInputRef.current.click()} title={t("uploadPhoto")} style={{ width: "76px", height: "76px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: "800", flexShrink: 0, position: "relative", cursor: "pointer" }}>
          {photo ? <img src={photo && (photo.startsWith("data:") || photo.startsWith("http")) ? photo : apiUrl(photo)} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : (name || "M").charAt(0).toUpperCase()}
          <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "26px", height: "26px", borderRadius: "50%", backgroundColor: theme.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.surface}`, boxSizing: "border-box" }}>
            <img src="https://api.iconify.design/lucide:camera.svg?color=%23ffffff" width="13" height="13" alt="" />
          </div>
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 4px 0", color: theme.text }}>{name}</h2>
          <div style={{ fontSize: "13px", color: theme.textSecondary }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><img src={`https://api.iconify.design/lucide:phone.svg?color=${encodeURIComponent(theme.textSecondary)}`} width="14" height="14" alt="" />{phone || t("guestPhone")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:star.svg?color=%23f59e0b&fill=%23f59e0b" width="14" height="14" alt="" />{user?.rating ?? d.rating ?? 0}</div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: "12px 14px", borderRadius: theme.radius.md, fontSize: "13px", fontWeight: "700", textAlign: "center", marginTop: "12px", backgroundColor: msgIsError ? theme.errorLight : theme.successLight, color: msgIsError ? theme.error : theme.success, border: `1px solid ${msgIsError ? theme.error : "transparent"}` }}>
          {statusMsg}
        </div>
      )}

      {(devices.length > 0 || experience || price || hours || location || card) && (
        <div style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.lg, padding: "16px 18px", marginTop: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "800", color: theme.text, margin: "0 0 4px 0" }}>{t("anketaData")}</h3>
          {row(t("masterExperience"), experience ? `${experience}+ ${t("masterYears")}` : null)}
          {row(t("masterDevices"), devices.length ? devices.join(", ") : null)}
          {row(t("masterPrice"), price ? `${price} so'm` : null, true)}
          {row(t("masterHours"), hours ? (typeof hours === "object" ? `${hours.open || ""} - ${hours.close || ""}` : hours) : null)}
          {row(t("masterLocationLabel"), location)}
          {row(t("masterCardInfo"), [bankName, card].filter(Boolean).join(" "))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
        {[
          { label: t("settings"), icon: "settings", action: onSettings },
          { label: t("helpSupport"), icon: "life-buoy", action: onSupport },
        ].map((it) => (
          <button key={it.label} onClick={it.action}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.md, cursor: "pointer", color: theme.text }}>
            <img src={`https://api.iconify.design/lucide:${it.icon}.svg?color=${encodeURIComponent(theme.textSecondary)}`} width="20" height="20" alt="" />
            <span style={{ flex: 1, textAlign: "left", fontSize: "14px", fontWeight: "600", color: theme.text }}>{it.label}</span>
            <img src="https://api.iconify.design/lucide:chevron-right.svg?color=%2394a3b8" width="18" height="18" alt="" />
          </button>
        ))}
        <button onClick={onLogout}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", backgroundColor: theme.surface, border: `1px solid ${theme.errorLight}`, borderRadius: theme.radius.md, cursor: "pointer", color: theme.error }}>
          <img src="https://api.iconify.design/lucide:log-out.svg?color=%23dc2626" width="20" height="20" alt="" />
          <span style={{ flex: 1, textAlign: "left", fontSize: "14px", fontWeight: "700", color: theme.error }}>{t("logout")}</span>
        </button>
      </div>
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
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [badges, setBadges] = useState({ orders: 0, chats: 0, saved: 0 });

  const refreshBadges = useCallback(async () => {
    const myId = user?.id || localStorage.getItem("ustachi_user_id");
    let orders = 0, chats = 0, saved = 0;
    try {
      const oRes = await fetch(apiUrl("/api/orders"), { headers: authHeaders() });
      const oData = await oRes.json();
      if (oRes.ok && oData.success && Array.isArray(oData.data)) {
        orders = oData.data.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status) && o.seen !== true).length;
      }
    } catch {}
    try {
      const cRes = await fetch(apiUrl("/api/chat/my"), { headers: authHeaders() });
      const cData = await cRes.json();
      if (cRes.ok && cData.success && Array.isArray(cData.data)) {
        chats = cData.data.filter((c) => c.unread ?? (c.lastSenderId && c.lastSenderId !== myId)).length;
      }
    } catch {}
    try {
      const savedList = await fetchSavedMasters();
      saved = (savedList || []).length;
    } catch {}
    setBadges({ orders, chats, saved });
  }, [user?.id]);

  useEffect(() => { refreshBadges(); }, [refreshBadges]);

  useEffect(() => { refreshBadges(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    attachSocket({
      onOrderNew: refreshBadges,
      onOrderUpdate: refreshBadges,
      onChatNew: refreshBadges,
    });
  }, [refreshBadges]);

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
    content = <OrdersView user={user} onViewOrder={onOpenOrder} onBadgeRefresh={refreshBadges} />;
  } else if (tab === "chats") {
    content = <ChatsView user={user} onOpenChat={onOpenChat} onBadgeRefresh={refreshBadges} />;
  } else {
    content = (
      <MasterProfileView
        user={user}
        onSettings={onOpenSettings}
        onSupport={onSupport}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family }}>
      <div style={{ flex: 1, overflowY: "auto" }}>{content}</div>

      <div style={{ position: "sticky", bottom: 0, width: "100%", maxWidth: "800px", margin: "0 auto", backgroundColor: theme.surface, borderTop: `1px solid ${theme.border}`, boxSizing: "border-box", display: "flex", justifyContent: "space-around", padding: "8px 0 10px 0", zIndex: 50, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
        {TABS.map((item) => {
          const isActive = tab === item.key;
          const color = isActive ? theme.primary : theme.textTertiary;
          const count = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
          return (
            <button key={item.key} onClick={() => setTab(item.key)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "2px 20px", color, position: "relative" }}>
              <div style={{ position: "relative" }}>
                <img src={`https://api.iconify.design/lucide:${item.icon}.svg?color=${encodeURIComponent(color)}`} width="22" height="22" alt="" />
                {count > 0 && (
                  <span style={{ position: "absolute", top: "-6px", right: "-10px", minWidth: "16px", height: "16px", borderRadius: "8px", backgroundColor: "#dc2626", color: "#ffffff", fontSize: "9px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", boxSizing: "border-box", lineHeight: 1, border: `2px solid ${theme.surface}` }}>
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span style={{ fontSize: "10px", fontWeight: isActive ? "800" : "600", color }}>{t(item.label)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MasterHome;
