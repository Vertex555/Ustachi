import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Map as MapIcon, List, MapPin, Star, Bookmark, BookmarkCheck, SearchX } from "lucide-react";
import { apiUrl, authHeaders } from "../services/api";
import { fetchSavedMasters, saveMaster, unsaveMaster } from "../services/savedMasters";
import { YandexMap } from "../components/YandexMap";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UBackBtn, USearchInput, UChip, UBadge, USelect, USkeleton, StarRating } from "../components/ui";

const DEVICE_FILTERS = [
  { value: "", labelKey: "allDevices" },
  { value: "phone", labelKey: "devPhone" },
  { value: "laptop", labelKey: "devLaptop" },
  { value: "tv", labelKey: "devTv" },
  { value: "washer", labelKey: "devWasher" },
  { value: "ac", labelKey: "devAc" },
  { value: "fridge", labelKey: "devFridge" },
];

const SORTS = [
  { value: "rating", labelKey: "sortRating" },
  { value: "price_asc", labelKey: "sortPriceAsc" },
  { value: "price_desc", labelKey: "sortPriceDesc" },
];

function distanceKm(a, b, c, d) {
  const R = 6371;
  const dLat = ((c - a) * Math.PI) / 180;
  const dLon = ((d - b) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a * Math.PI) / 180) * Math.cos((c * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))).toFixed(1));
}

function fmt(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(Number(n) || 0));
}

const AVAIL = {
  available: { variant: "success", key: "available" },
  busy: { variant: "warning", key: "busy" },
  off: { variant: "neutral", key: "offline" },
};

export const MasterSearchScreen = ({ onBack, onOrder, onViewProfile, initialDevice }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [q, setQ] = useState("");
  const [device, setDevice] = useState(initialDevice || "");
  const [sort, setSort] = useState("rating");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState("list");
  const [savedIds, setSavedIds] = useState([]);
  const [userLoc, setUserLoc] = useState({ lat: 41.311081, lng: 69.240562 });

  useEffect(() => {
    fetchSavedMasters().then((list) => setSavedIds(list.map((m) => String(m.id)))).catch(() => {});
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const { data: masters = [], isLoading } = useQuery({
    queryKey: ["masters-search", q, device, sort, maxPrice],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (device) params.set("device", device);
      if (sort) params.set("sort", sort);
      if (Number(maxPrice) > 0) params.set("maxPrice", String(maxPrice));
      const res = await fetch(apiUrl(`/api/masters?${params.toString()}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data)) return data;
      return [];
    },
  });

  const decorated = useMemo(() => {
    return masters.map((m) => {
      const lat = m.location?.lat ?? 41.311081;
      const lng = m.location?.lng ?? 69.240562;
      const dist = distanceKm(userLoc.lat, userLoc.lng, lat, lng);
      return { ...m, lat, lng, distanceNum: dist };
    });
  }, [masters, userLoc]);

  const toggleSave = async (m) => {
    const id = String(m.id);
    if (savedIds.includes(id)) {
      await unsaveMaster(m.id);
      setSavedIds(savedIds.filter((x) => x !== id));
    } else {
      await saveMaster({ id: m.id, name: m.name, price: m.price, specialty: Array.isArray(m.devices) ? m.devices[0] : m.devices });
      setSavedIds([...savedIds, id]);
    }
  };

  const activeFilters = (device ? 1 : 0) + (Number(maxPrice) > 0 ? 1 : 0) + (sort !== "rating" ? 1 : 0);

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "16px", width: "100%", boxSizing: "border-box", fontFamily: theme.font.family }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
        <UBackBtn onClick={onBack} />
        <h1 style={{ margin: 0, flex: 1, fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.text, letterSpacing: "-0.02em" }}>
          {t("searchTitle") || "Usta qidirish"}
        </h1>
        <button
          onClick={() => setView(view === "list" ? "map" : "list")}
          title={view === "list" ? (t("mapView") || "Xarita") : (t("listView") || "Ro'yxat")}
          style={{ position: "relative", border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, borderRadius: theme.radius.full, width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: theme.raiseSm.boxShadow }}
        >
          {view === "list" ? <MapIcon size={18} /> : <List size={18} />}
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <USearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder") || "Ism, qurilma, hudud..."} />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          style={{ position: "relative", border: `1px solid ${activeFilters ? "transparent" : theme.border}`, background: activeFilters ? (theme.gradient || theme.primary) : theme.surface, color: activeFilters ? "#fff" : theme.text, borderRadius: theme.radius.md, padding: "0 14px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: theme.font.bold, fontSize: theme.font.sm, boxShadow: theme.raiseSm.boxShadow, fontFamily: theme.font.family }}
        >
          <SlidersHorizontal size={17} />
          <span className="filter-label">{t("filters") || "Filtr"}</span>
          {activeFilters > 0 && (
            <span style={{ minWidth: "18px", height: "18px", borderRadius: "999px", background: "#fff", color: theme.primary, fontSize: "11px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeFilters}</span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="ust-slide-down ust-neumo" style={{ padding: "16px", marginBottom: "12px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
            {DEVICE_FILTERS.map((d) => (
              <UChip key={d.value} active={device === d.value} onClick={() => setDevice(d.value)}>
                {t(d.labelKey) || d.value || (t("allDevices") || "Barchasi")}
              </UChip>
            ))}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px" }}>
              <USelect label={t("sort") || "Saralash"} value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS.map((s) => ({ value: s.value, label: t(s.labelKey) || s.value }))} />
            </div>
            <div style={{ flex: "1 1 180px" }}>
              <USelect
                label={t("maxPrice") || "Maks. narx"}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                options={[
                  { value: "", label: t("any") || "Farqsiz" },
                  { value: "200000", label: `≤ ${fmt(200000)}` },
                  { value: "400000", label: `≤ ${fmt(400000)}` },
                  { value: "700000", label: `≤ ${fmt(700000)}` },
                  { value: "1000000", label: `≤ ${fmt(1000000)}` },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Xarita ko'rinishi */}
      {view === "map" && (
        <div style={{ borderRadius: theme.radius.lg, border: `1px solid ${theme.border}`, overflow: "hidden", marginBottom: "14px", height: "360px", backgroundColor: theme.bgTertiary }}>
          <YandexMap
            center={userLoc}
            zoom={12}
            height={360}
            markers={[
              { lat: userLoc.lat, lng: userLoc.lng, color: "rd" },
              ...decorated.map((m) => ({ lat: m.lat, lng: m.lng, color: "gn" })),
            ]}
          />
        </div>
      )}

      {/* Natijalar */}
      {isLoading ? (
        <div className="ust-list-grid">
          {[0, 1, 2, 3].map((i) => (
            <USkeleton key={i} height="92px" radius={theme.radius.lg} />
          ))}
        </div>
      ) : decorated.length === 0 ? (
        <div className="ust-neumo" style={{ padding: "48px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: theme.gradientSoft || theme.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SearchX size={30} style={{ color: theme.primary }} />
          </div>
          <div style={{ fontSize: theme.font.lg, fontWeight: theme.font.bold, color: theme.text }}>{t("noMastersFound") || "Usta topilmadi"}</div>
          <div style={{ fontSize: theme.font.sm, color: theme.textSecondary, maxWidth: "280px" }}>{t("tryOtherFilters") || "Filtrlarni o'zgartirib ko'ring"}</div>
        </div>
      ) : (
        <div className="ust-list-grid">
          {decorated.map((m) => {
            const av = AVAIL[m.availability] || AVAIL.available;
            const saved = savedIds.includes(String(m.id));
            return (
              <div key={m.id} className="ust-neumo" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div onClick={() => onViewProfile && onViewProfile(m)} style={{ width: "50px", height: "50px", borderRadius: "14px", background: m.photo ? "transparent" : (theme.gradientSoft || theme.primaryLight), color: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "19px", flexShrink: 0, overflow: "hidden", cursor: "pointer", border: `1px solid ${theme.border}` }}>
                    {m.photo ? (
                      <img src={m.photo.startsWith("data:") || m.photo.startsWith("http") ? m.photo : apiUrl(m.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      (m.name || "M").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div onClick={() => onViewProfile && onViewProfile(m)} style={{ fontSize: theme.font.base, fontWeight: theme.font.bold, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                      {m.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                      <StarRating value={m.rating || 0} size={13} showValue />
                      {m.reviewsCount > 0 && <span style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>({m.reviewsCount})</span>}
                    </div>
                  </div>
                  <UBadge variant={av.variant}>{t(av.key) || av.key}</UBadge>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: theme.font.sm, color: theme.textSecondary, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={13} style={{ color: theme.primary }} /> {m.distanceNum} km
                  </span>
                  {m.price > 0 && (
                    <span style={{ fontWeight: theme.font.bold, color: theme.text }}>
                      {fmt(m.price)} so'mdan
                    </span>
                  )}
                </div>

                {Array.isArray(m.devices) && m.devices.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {m.devices.slice(0, 3).map((d) => (
                      <span key={d} style={{ fontSize: theme.font.xs, padding: "3px 9px", borderRadius: "999px", background: theme.bgTertiary, color: theme.textSecondary, fontWeight: theme.font.semibold }}>
                        {d}
                      </span>
                    ))}
                    {m.devices.length > 3 && (
                      <span style={{ fontSize: theme.font.xs, padding: "3px 8px", color: theme.textTertiary }}>+{m.devices.length - 3}</span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                  <button
                    onClick={() => toggleSave(m)}
                    aria-label={t("saveMaster") || "Saqlash"}
                    style={{ width: "44px", flexShrink: 0, borderRadius: theme.radius.md, border: `1px solid ${theme.border}`, background: saved ? (theme.gradientSoft || theme.primaryLight) : theme.surface, color: saved ? theme.primary : theme.textSecondary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                  </button>
                  <button
                    onClick={() => onOrder && onOrder(m, userLoc, { device: device || (m.devices && m.devices[0]) || "" })}
                    style={{ flex: 1, borderRadius: theme.radius.md, border: "none", background: theme.gradient || theme.primary, color: "#fff", fontWeight: theme.font.bold, fontSize: theme.font.sm, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "11px" }}
                  >
                    <Star size={15} /> {t("order") || "Buyurtma"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MasterSearchScreen;
