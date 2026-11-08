import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { fetchSavedMasters } from "../services/savedMasters";
import { displayPhone, isGuestPhone } from "../utils/display";
import { ConfirmLogoutModal } from "../components/ConfirmLogoutModal";

export const UserProfile = ({
  user,
  onEditProfile,
  onMyOrders,
  onSaved,
  onSettings,
  onSupport,
  onLogout,
  onSaveProfile,
  onFeedback,
  onCards,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [stats, setStats] = useState({ totalOrders: 0, reviewsGiven: 0 });
  const [savedCount, setSavedCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(user?.photo || "");
  const avatarInputRef = useRef(null);

  const [newPhone, setNewPhone] = useState((user?.phone && !isGuestPhone(user?.phone)) ? user?.phone : "+998 ");
  const [phoneError, setPhoneError] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);

  const displayPhoneValue = displayPhone(user?.phone, t("guestPhone"));

  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, "");
    let rawNumber = numbers.startsWith("998") ? numbers.slice(3) : numbers;
    rawNumber = rawNumber.slice(0, 9);

    let formatted = "+998";
    if (rawNumber.length > 0) formatted += " (" + rawNumber.slice(0, 2);
    if (rawNumber.length >= 2) formatted += ") ";
    if (rawNumber.length > 2) formatted += rawNumber.slice(2, 5);
    if (rawNumber.length > 5) formatted += "-" + rawNumber.slice(5, 7);
    if (rawNumber.length > 7) formatted += "-" + rawNumber.slice(7, 9);

    return formatted;
  };

  const handlePhoneInput = (e) => {
    const inputVal = e.target.value;
    if (!inputVal || inputVal.trim() === "" || inputVal === "+998") {
      setNewPhone("+998 ");
      setPhoneError("");
      return;
    }
    setNewPhone(formatPhoneNumber(inputVal));
    setPhoneError("");
  };

  const openEdit = () => {
    setNewPhone((user?.phone && !isGuestPhone(user?.phone)) ? user?.phone : "+998 ");
    setPhoneError("");
    setEditing(true);
  };

  const closeEdit = () => {
    setPhoneError("");
    setEditing(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      if (dataUrl.length > 1500000) {
        setSavedMsg(t("photoTooLarge"));
        setTimeout(() => setSavedMsg(""), 3000);
        return;
      }
      setAvatar(dataUrl);
      try {
        const res = await fetch(apiUrl("/api/users/me/profile"), {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ photo: dataUrl }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSavedMsg(t("profileUpdated"));
          if (onSaveProfile) onSaveProfile({ name, email, photo: dataUrl, phone: user?.phone });
          setTimeout(() => setSavedMsg(""), 2000);
        }
      } catch {}
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeAvatar = async () => {
    setAvatar("");
    try {
      await fetch(apiUrl("/api/users/me/profile"), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ photo: null }),
      });
      if (onSaveProfile) onSaveProfile({ name, email, photo: null, phone: user?.phone });
    } catch {}
  };

  const initial = (name || user?.name || "U").charAt(0).toUpperCase();

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/orders"), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        const reviewsGiven = data.data.filter((o) => (o.rating || 0) > 0).length;
        setStats({ totalOrders: data.data.length, reviewsGiven });
      }
    } catch {}
    const saved = await fetchSavedMasters();
    setSavedCount(saved.length);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleSaveProfile = async () => {
    const cleanName = name.trim();
    const cleanPhone = newPhone.replace(/\D/g, "");
    const digitsBeyondPrefix = cleanPhone.replace(/^998/, "").length;
    const phoneValid = /^998\d{9}$/.test(cleanPhone);
    if (digitsBeyondPrefix > 0 && !phoneValid) {
      setPhoneError(t("invalidPhone"));
      return;
    }
    const normalizedPhone = phoneValid ? "+" + cleanPhone : "";
    const payload = { name: cleanName, email: email.trim() };
    if (normalizedPhone) payload.phone = normalizedPhone;
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/users/me/profile"), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditing(false);
        setSavedMsg(t("profileUpdated"));
        if (onSaveProfile) onSaveProfile({ name: cleanName, email, photo: avatar, phone: normalizedPhone || user?.phone });
        setTimeout(() => setSavedMsg(""), 2000);
      } else {
        setPhoneError(data.message || t("error"));
      }
    } catch {}
    setSaving(false);
  };

  const navItems = [
    { key: "orders", label: t("myOrders"), icon: "package", action: onMyOrders },
    { key: "saved", label: t("savedMasters"), icon: "bookmark", action: onSaved },
    { key: "cards", label: t("myCards"), icon: "credit-card", action: onCards },
    { key: "settings", label: t("settings"), icon: "settings", action: onSettings },
    { key: "support", label: t("helpSupport"), icon: "life-buoy", action: onSupport },
    { key: "feedback", label: t("feedback"), icon: "message-square", action: onFeedback },
  ].filter((i) => i.action);

  const menuItem = (item) => (
    <button key={item.key} onClick={item.action} className="custom-btn ust-neumo"
      style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", backgroundColor: theme.neumorphSurface, border: "none", borderRadius: theme.neumorph.radius, cursor: "pointer", color: theme.text }}>
      <img src={`https://api.iconify.design/lucide:${item.icon}.svg?color=${encodeURIComponent(theme.textSecondary)}`} width="20" height="20" alt="" />
      <span style={{ flex: 1, textAlign: "left", fontSize: "14px", fontWeight: "600", color: theme.text }}>{item.label}</span>
      <img src={`https://api.iconify.design/lucide:chevron-right.svg?color=${encodeURIComponent(theme.textTertiary)}`} width="18" height="18" alt="" />
    </button>
  );

  return (
    <div style={{ width: "100%", fontFamily: theme.font.family }}>
      <style>{`.custom-btn:active { transform: scale(0.98); }`}</style>
      <div style={{ width: "100%", maxWidth: "100%", margin: "0 auto", boxSizing: "border-box", padding: "16px" }}>
        {/* Yuqori: Sarlavha + Edit Profile */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: theme.text }}>{t("myProfile")}</h1>
          <button onClick={openEdit} className="custom-btn ust-neumo"
            style={{ backgroundColor: theme.neumorphSurface, border: "none", color: theme.primary, padding: "9px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <img src="https://api.iconify.design/lucide:pen-square.svg?color=%23059669" width="14" height="14" alt="" />
            {t("editProfile")}
          </button>
        </div>

        {savedMsg && (
          <div style={{ backgroundColor: theme.successLight, color: theme.success, padding: "10px 14px", borderRadius: theme.radius.md, fontSize: "13px", fontWeight: "700", marginBottom: "12px", textAlign: "center" }}>{savedMsg}</div>
        )}

        {/* Profil kartasi � ko'tarilgan (raised) */}
        <div className="ust-neumo" style={{ backgroundColor: theme.neumorphSurface, border: "none", borderRadius: theme.neumorph.radiusLg, padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div onClick={() => avatarInputRef.current && avatarInputRef.current.click()} title={t("uploadPhoto")} style={{ width: "76px", height: "76px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: "800", flexShrink: 0, position: "relative", cursor: "pointer" }}>
            {avatar ? <img src={avatar} alt="avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : initial}
            <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "26px", height: "26px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.surface}`, boxSizing: "border-box" }}>
              <img src="https://api.iconify.design/lucide:camera.svg?color=%23ffffff" width="13" height="13" alt="" />
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 4px 0", color: theme.text }}>{name || user?.name || t("user")}</h2>
            <div style={{ fontSize: "13px", color: theme.textSecondary, display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><img src={`https://api.iconify.design/lucide:phone.svg?color=${encodeURIComponent(theme.textSecondary)}`} width="13" height="13" alt="" />{displayPhoneValue}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><img src={`https://api.iconify.design/lucide:mail.svg?color=${encodeURIComponent(theme.textSecondary)}`} width="13" height="13" alt="" />{email || ""}</span>
            </div>
            {avatar && (
              <button onClick={removeAvatar} style={{ background: "none", border: "none", color: theme.error, fontSize: "11px", fontWeight: "700", cursor: "pointer", padding: "4px 0 0 0" }}>{t("removeAvatar")}</button>
            )}
          </div>
        </div>

        {/* Statistika */}
        <div style={{ display: "flex", gap: "10px", margin: "16px 0" }}>
          {[
            { value: stats.totalOrders, label: t("totalOrders") },
            { value: savedCount, label: t("savedMasters") },
            { value: stats.reviewsGiven, label: t("reviewsGiven") },
          ].map((s, i) => (
            <div key={i} className="ust-neumo" style={{ flex: 1, backgroundColor: theme.neumorphSurface, border: "none", borderRadius: theme.neumorph.radius, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "22px", fontWeight: "900", color: theme.primary }}>{s.value}</div>
              <div style={{ fontSize: "11px", color: theme.textSecondary, fontWeight: "600", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Menyu */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {navItems.map(menuItem)}
          <button onClick={() => setConfirmLogout(true)} className="custom-btn"
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", backgroundColor: theme.neumorphSurface, border: "none", borderRadius: theme.neumorph.radius, cursor: "pointer", color: theme.error }}>
            <img src="https://api.iconify.design/lucide:log-out.svg?color=%23dc2626" width="20" height="20" alt="" />
            <span style={{ flex: 1, textAlign: "left", fontSize: "14px", fontWeight: "700", color: theme.error }}>{t("logout")}</span>
          </button>
        </div>
      </div>

      <ConfirmLogoutModal
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => { setConfirmLogout(false); onLogout(); }}
      />

      {/* Edit Profile modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px", boxSizing: "border-box" }} onClick={closeEdit}>
          <div onClick={(e) => e.stopPropagation()} className="ust-neumo" style={{ backgroundColor: theme.neumorphSurface, border: "none", borderRadius: theme.neumorph.radiusLg, padding: "22px", width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "12px", boxSizing: "border-box", maxHeight: "90vh", overflowY: "auto", minWidth: 0 }}>
            <h3 style={{ fontSize: "17px", fontWeight: "800", color: theme.text, margin: 0 }}>{t("editProfile")}</h3>

            <label style={{ fontSize: "12px", fontWeight: "700", color: theme.text, margin: 0 }}>{t("fullName2")}</label>
            <input name="profileName" value={name} onChange={(e) => setName(e.target.value)} placeholder="To'liq ism"
              className="ust-neumo-inset" style={{ width: "100%", padding: "12px", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", backgroundColor: theme.neumorphInsetBg, color: theme.text }} />

            <label style={{ fontSize: "12px", fontWeight: "700", color: theme.text, margin: 0 }}>{t("emailAddress")}</label>
            <input name="profileEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@mail.com" type="email"
              className="ust-neumo-inset" style={{ width: "100%", padding: "12px", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", backgroundColor: theme.neumorphInsetBg, color: theme.text }} />

            <label style={{ fontSize: "12px", fontWeight: "700", color: theme.text, margin: 0 }}>{t("phoneNumber")}</label>
            <input name="profilePhone" value={newPhone} onChange={handlePhoneInput} type="tel" placeholder="+998 (90) 123-45-67"
              className="ust-neumo-inset" style={{ width: "100%", padding: "12px", borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", backgroundColor: theme.neumorphInsetBg, color: theme.text }} />
            {phoneError && <span style={{ fontSize: "11px", color: theme.error, fontWeight: "700" }}>{phoneError}</span>}

            <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
              <button onClick={closeEdit} className="custom-btn ust-neumo" style={{ flex: 1, backgroundColor: theme.neumorphSurface, color: theme.text, border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>{t("cancel")}</button>
              <button onClick={handleSaveProfile} disabled={saving} className="custom-btn" style={{ flex: 1, backgroundColor: theme.primary, color: theme.textInverse, border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}>{t("save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;

