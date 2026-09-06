import React, { useState, useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { apiUrl } from "../services/api";
import { fetchSavedMasters, unsaveMaster } from "../services/savedMasters";

export const SavedMastersScreen = ({ user, onBack, onOrder, onViewProfile }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [masters, setMasters] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      const list = await fetchSavedMasters();
      setMasters(list);
    })();
  }, []);

  const handleRemove = async (id) => {
    const list = await unsaveMaster(id);
    setMasters(list);
  };

  return (
    <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto", fontFamily: theme.font.family, boxSizing: "border-box" }}>
      <div style={{ width: "100%", boxSizing: "border-box", padding: "16px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 16px 0", textAlign: "center" }}>{t("savedMasters")}</h1>

        {masters.length === 0 && (
          <p style={{ color: theme.textSecondary, textAlign: "center", padding: "40px 0" }}>{t("noSavedMasters")}</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "stretch" }}>
          {masters.map((m) => (
            <div key={m.id} style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.md, padding: "14px", display: "flex", alignItems: "center", gap: "12px", width: "100%", boxSizing: "border-box" }}>
              <button onClick={() => onViewProfile ? onViewProfile(m) : setSelected(m)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: theme.text, display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", flexShrink: 0, overflow: "hidden", border: `1px solid ${theme.border}` }}>
                  {m.photo ? <img src={m.photo && (m.photo.startsWith("data:") || m.photo.startsWith("http")) ? m.photo : apiUrl(m.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (m.name || "M").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: theme.text }}>{m.name}</div>
                  <div style={{ fontSize: "12px", color: theme.textSecondary }}>{m.price ? `${Number(m.price).toLocaleString()} so'm` : m.specialty || m.devices || ""}</div>
                  <div style={{ fontSize: "11px", color: theme.primary, fontWeight: "600", marginTop: "2px" }}>{t("tapToView")}</div>
                </div>
              </button>
              <button onClick={() => handleRemove(m.id)} aria-label={t("remove")}
                style={{ backgroundColor: "transparent", border: "none", cursor: "pointer", color: theme.error, padding: "6px", flexShrink: 0 }}>
                <img src="https://api.iconify.design/lucide:trash-2.svg?color=%23dc2626" width="18" height="18" alt="" />
              </button>
            </div>
          ))}
        </div>

        {masters.length > 0 && (
          <button onClick={() => onOrder(masters[0])}
            style={{ width: "100%", marginTop: "16px", backgroundColor: theme.primary, color: theme.textInverse, border: "none", borderRadius: "14px", padding: "14px", fontSize: "15px", fontWeight: "800", cursor: "pointer" }}>
            {t("chooseMaster")}
          </button>
        )}
      </div>

      {selected && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px", boxSizing: "border-box" }} onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: "22px", width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "12px", boxSizing: "border-box", boxShadow: theme.shadowXl, alignItems: "center" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: "800", overflow: "hidden", border: `1px solid ${theme.border}` }}>
              {selected.photo ? <img src={selected.photo && (selected.photo.startsWith("data:") || selected.photo.startsWith("http")) ? selected.photo : apiUrl(selected.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (selected.name || "M").charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: theme.text, margin: 0 }}>{selected.name}</h2>
            <div style={{ fontSize: "13px", color: theme.textSecondary, textAlign: "center" }}>
              {selected.rating ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:star.svg?color=%23f59e0b&fill=%23f59e0b" width="13" height="13" alt="" />{selected.rating}</div> : null}
              <div>{selected.price ? `${Number(selected.price).toLocaleString()} so'm` : (selected.specialty || selected.devices || "")}</div>
              {selected.distance ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:map-pin.svg?color=%2359656e" width="13" height="13" alt="" />{selected.distance}</div> : null}
            </div>
            <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "6px" }}>
              <button onClick={() => setSelected(null)} style={{ flex: 1, backgroundColor: theme.bgTertiary, color: theme.text, border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>{t("cancel")}</button>
              <button onClick={() => { setSelected(null); onOrder(selected); }} style={{ flex: 1, backgroundColor: theme.primary, color: theme.textInverse, border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}>{t("chooseMaster")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedMastersScreen;
