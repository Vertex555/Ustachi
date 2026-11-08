import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, authHeaders } from "../services/api";
import { YandexMap } from "../components/YandexMap";
import { fetchSavedMasters, saveMaster, unsaveMaster } from "../services/savedMasters";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export const ResultsScreen = ({ orderParams, onBack, onOrder }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const details = orderParams?.details || {};
  const userLocation = orderParams?.userLocation || { lat: 41.311081, lng: 69.240562 };
  const device = details.device || "";

  const [filterType, setFilterType] = useState("rating");
  const [savedIds, setSavedIds] = useState([]);

  const { data: masters = [] } = useQuery({
    queryKey: ["masters", "all"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/masters"), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data && Array.isArray(data.data)) return data.data;
      if (data && Array.isArray(data)) return data;
      return [];
    },
  });

  useEffect(() => {
    (async () => {
      const list = await fetchSavedMasters();
      setSavedIds(list.map((m) => String(m.id)));
    })();
  }, []);

  const toggleSave = async (master) => {
    if (savedIds.includes(String(master.id))) {
      await unsaveMaster(master.id);
      setSavedIds(savedIds.filter((id) => id !== String(master.id)));
    } else {
      await saveMaster({ id: master.id, name: master.name, price: master.price, specialty: Array.isArray(master.devices) ? master.devices[0] : master.devices });
      setSavedIds([...savedIds, String(master.id)]);
    }
  };

  const filtered = masters.filter((m) => !m.devices || !m.devices.length || m.devices.includes(device));
  const decorated = filtered.map((m) => {
    const lat = m.location?.lat || m.lat || 41.311081;
    const lng = m.location?.lng || m.lng || 69.240562;
    const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
    return { ...m, lat, lng, distanceNum: dist, distance: `${dist} km` };
  });
  const sorted = [...decorated].sort((a, b) =>
    filterType === "distance" ? a.distanceNum - b.distanceNum : b.rating - a.rating
  );

  const issueLabel = details.issue || "";
  const modelLabel = [details.deviceModel, details.device].filter(Boolean).join(" ");

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: "100vh", backgroundColor: theme.bg }}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%", maxWidth: "100%", backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family, boxSizing: "border-box", padding: "16px", boxShadow: "0 0 20px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <button onClick={onBack} aria-label={t("back")}
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: theme.text, fontSize: "18px", fontWeight: "bold", boxShadow: theme.shadowSm }}><img src={`https://api.iconify.design/lucide:chevron-left.svg?color=${encodeURIComponent(theme.text)}`} width="18" height="18" alt="" /></button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: theme.text }}>{t("up_results")}</h1>
            <span style={{ fontSize: "12px", color: theme.textSecondary }}>{modelLabel}{issueLabel ? ` — ${issueLabel}` : ""}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <button onClick={() => setFilterType("rating")} className="custom-btn" style={{ padding: "7px 14px", fontSize: "12px", borderRadius: "20px", border: "none", backgroundColor: filterType === "rating" ? theme.primary : theme.bgTertiary, color: filterType === "rating" ? theme.textInverse : theme.text, fontWeight: "700", cursor: "pointer" }}>{t("up_rating")}</button>
          <button onClick={() => setFilterType("distance")} className="custom-btn" style={{ padding: "7px 14px", fontSize: "12px", borderRadius: "20px", border: "none", backgroundColor: filterType === "distance" ? theme.primary : theme.bgTertiary, color: filterType === "distance" ? theme.textInverse : theme.text, fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}><img src={`https://api.iconify.design/lucide:map-pin.svg?color=${encodeURIComponent(filterType === "distance" ? "#ffffff" : theme.text)}`} width="13" height="13" alt="" />{t("up_mapRadar")}</button>
        </div>

        <div style={{ width: "100%", height: "240px", borderRadius: theme.radius.md, border: `1px solid ${theme.border}`, overflow: "hidden", marginBottom: "14px", backgroundColor: theme.bgTertiary }}>
          <YandexMap
            center={userLocation}
            zoom={12}
            height={240}
            markers={[
              { lat: userLocation.lat, lng: userLocation.lng, color: "rd" },
              ...sorted.map((m) => ({ lat: m.lat, lng: m.lng, color: "gn" })),
            ]}
          />
        </div>

<div className="ust-list-grid" style={{ flex: 1 }}>
          {sorted.length === 0 ? (
            <p style={{ fontSize: "14px", color: theme.textTertiary, textAlign: "center", padding: "30px 0" }}>{t("up_noMasters")}</p>
          ) : (
            sorted.map((master) => (
              <div key={master.id} style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.md, padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px", boxSizing: "border-box" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: master.photo ? "transparent" : theme.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", border: `1px solid ${theme.border}` }}>
                  {master.photo ? <img src={master.photo && (master.photo.startsWith("data:") || master.photo.startsWith("http")) ? master.photo : apiUrl(master.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: theme.text, fontSize: "16px", fontWeight: "800" }}>{(master.name || "M").charAt(0).toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 3px 0", color: theme.text }}>{master.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: theme.textSecondary, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:star.svg?color=%23059669&fill=%23059669" width="13" height="13" alt="" />{master.rating ?? 0}</span>
                    <span>•</span>
                    <span style={{ color: theme.primary, fontWeight: "700" }}>{master.distance}</span>
                  </div>
                </div>
                <button onClick={() => toggleSave(master)} className="custom-btn" aria-label={t("up_saveMaster")}
                  style={{ backgroundColor: savedIds.includes(String(master.id)) ? theme.primary : theme.bgTertiary, color: savedIds.includes(String(master.id)) ? theme.textInverse : theme.textSecondary, border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", flexShrink: 0 }}>
                  <img src={savedIds.includes(String(master.id)) ? "https://api.iconify.design/lucide:bookmark-check.svg?color=%23ffffff" : "https://api.iconify.design/lucide:bookmark.svg?color=%2364748B"} alt="" width="16" height="16" />
                </button>
                <button onClick={() => onOrder(master, userLocation, details)} className="custom-btn"
                  style={{ backgroundColor: theme.primary, color: theme.textInverse, border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: "800", cursor: "pointer", flexShrink: 0 }}>
                  {t("up_choose")}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;


