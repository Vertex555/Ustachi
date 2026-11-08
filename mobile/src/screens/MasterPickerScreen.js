import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, Pressable, TextInput, FlatList, Image, ActivityIndicator, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import { apiUrl, authHeaders } from "../services/api";
import { fetchSavedMasters, saveMaster, unsaveMaster } from "../services/savedMasters";
import { formatPrice } from "../utils/display";

const FALLBACK_LOCATION = { lat: 41.311081, lng: 69.240562 };

const DEVICES = [
  { id: "Smartfon", name: "Smartfon", icon: "smartphone" },
  { id: "Noutbuk", name: "Noutbuk", icon: "laptop" },
  { id: "Planshet", name: "Planshet", icon: "tablet" },
  { id: "Soat", name: "Smart-soat", icon: "watch" },
  { id: "TV", name: "Televizor", icon: "tv" },
];

function calculateDistanceNum(lat1, lon1, lat2, lon2) {
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

// Usta tanlash ekrani — buyurtma berish uchun usta majburiy tanlanadi.
// (FALLBACK_MASTER butunlay olib tashlandi: noto'g'ri ustaga buyurtma ketmasligi kerak)
export function MasterPickerScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const params = route?.params || {};
  const presetDevice = params.device || "";
  const presetQuery = params.query || "";
  const userLocation = params.userLocation || FALLBACK_LOCATION;
  const details = params.details || {};

  const [query, setQuery] = useState(presetQuery);
  const [device, setDevice] = useState(presetDevice);
  const [sortBy, setSortBy] = useState("rating");
  const [masters, setMasters] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [querying, setQuerying] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await fetchSavedMasters();
      setSavedIds(list.map((m) => String(m.id)));
    })();
  }, []);

  const load = useCallback(async () => {
    setQuerying(true);
    try {
      const qs = [];
      if (query.trim()) qs.push(`q=${encodeURIComponent(query.trim())}`);
      if (device) qs.push(`device=${encodeURIComponent(device)}`);
      const url = `/api/masters${qs.length ? `?${qs.join("&")}&limit=50` : "?limit=50"}`;
      const res = await fetch(apiUrl(url), { headers: authHeaders() });
      const data = await res.json();
      setMasters(Array.isArray(data && data.data) ? data.data : []);
    } catch {
      setMasters([]);
    } finally {
      setQuerying(false);
      setLoading(false);
    }
  }, [query, device]);

  useEffect(() => {
    load();
  }, [load]);

  // Qurilma bo'yicha qo'lda filtr (serverda faqat aniq `device` filtri bor)
  const visible = useMemo(() => {
    let list = masters.filter((m) => m && m.id);
    if (device) {
      list = list.filter((m) => !Array.isArray(m.devices) || m.devices.length === 0 || m.devices.includes(device));
    }
    const ulat = userLocation || FALLBACK_LOCATION;
    return list
      .map((m) => {
        const lat = (m.location && m.location.lat) != null ? m.location.lat : FALLBACK_LOCATION.lat;
        const lng = (m.location && m.location.lng) != null ? m.location.lng : FALLBACK_LOCATION.lng;
        return { ...m, _dist: calculateDistanceNum(ulat.lat, ulat.lng, lat, lng) };
      })
      .sort((a, b) => (sortBy === "distance" ? a._dist - b._dist : (b.rating || 0) - (a.rating || 0)));
  }, [masters, device, sortBy, userLocation]);

  const choose = (m) => {
    navigation.navigate("PreOrder", {
      master: m,
      userLocation,
      details: { ...details, device: details.device || device },
    });
  };

  const toggleSave = async (m) => {
    const id = String(m.id);
    if (savedIds.includes(id)) {
      setSavedIds((prev) => prev.filter((x) => x !== id));
      await unsaveMaster(id);
    } else {
      setSavedIds((prev) => [...prev, id]);
      await saveMaster(m);
    }
  };

  const renderRow = ({ item }) => {
    const saved = savedIds.includes(String(item.id));
    return (
      <View
        style={{
          backgroundColor: theme.neumorph.surface,
          borderRadius: theme.neumorph.radius,
          padding: 12,
          gap: 10,
          ...theme.neumorph.raisedSm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 46, height: 46, borderRadius: 23,
              backgroundColor: theme.neumorph.surface,
              alignItems: "center", justifyContent: "center",
              overflow: "hidden", ...theme.neumorph.itemRaised,
            }}
          >
            {item.photo ? (
              <Image source={{ uri: item.photo }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={{ fontSize: 18, fontWeight: "800", color: theme.primary }}>
                {(item.name || "?").charAt(0)}
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }} numberOfLines={1}>
              {item.name || t("master")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
              <Icon name="star" size={11} color={theme.warning} />
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                {(item.rating ?? 0).toFixed(1)} · {item._dist} km
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => toggleSave(item)}
            hitSlop={10}
            accessibilityLabel={saved ? t("remove") : t("save")}
          >
            <Icon name={saved ? "bookmark" : "bookmark-outline"} size={20} color={saved ? theme.primary : theme.textTertiary} />
          </Pressable>
        </View>

        {!!item.experience ? (
          <Text style={{ fontSize: 11.5, color: theme.textSecondary, lineHeight: 16 }} numberOfLines={2}>
            {item.experience}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.primary }}>
            {formatPrice(item.price, item.currency)}
          </Text>
          <Pressable
            onPress={() => choose(item)}
            style={({ pressed }) => [
              {
                paddingVertical: 9, paddingHorizontal: 20, borderRadius: theme.radius.full,
                backgroundColor: theme.primary, flexDirection: "row", alignItems: "center", gap: 6,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Icon name="check" size={14} color={theme.textInverse} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: theme.textInverse }}>{t("up_choose")}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: theme.neumorph.surface,
          borderBottomLeftRadius: theme.neumorph.radiusLg,
          borderBottomRightRadius: theme.neumorph.radiusLg,
          gap: 12,
          ...theme.neumorph.raisedSm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel={t("back")}>
            <Icon name="chevron-left" size={26} color={theme.text} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: theme.font.lg, fontWeight: "800", color: theme.text }}>
            {t("chooseMaster")}
          </Text>
        </View>

        {/* Qidiruv */}
        <View
          style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: theme.neumorph.insetBg, borderRadius: theme.neumorph.radius,
            paddingHorizontal: 14, paddingVertical: 10, ...theme.neumorph.inset,
          }}
        >
          <Icon name="search" size={16} color={theme.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("searchMasterPlaceholder")}
            placeholderTextColor={theme.textTertiary}
            style={{ flex: 1, fontSize: theme.font.sm, color: theme.text, padding: 0 }}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Icon name="refresh-cw" size={14} color={theme.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        {/* Qurilma filtri */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <FilterChip active={!device} label={t("allDevices")} onPress={() => setDevice("")} />
          {DEVICES.map((d) => (
            <FilterChip
              key={d.id}
              active={device === d.id}
              label={t("upd_" + d.id, d.name)}
              onPress={() => setDevice(device === d.id ? "" : d.id)}
            />
          ))}
        </ScrollView>

        {/* Saralash */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { key: "rating", label: t("sortByRating"), icon: "star" },
            { key: "distance", label: t("sortByDistance"), icon: "map-pin" },
          ].map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setSortBy(s.key)}
              style={({ pressed }) => [
                {
                  flexDirection: "row", alignItems: "center", gap: 6,
                  paddingVertical: 7, paddingHorizontal: 14, borderRadius: theme.radius.full,
                  backgroundColor: sortBy === s.key ? theme.primary : theme.neumorph.surface,
                  ...(sortBy === s.key ? {} : theme.neumorph.raisedSm),
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Icon name={s.icon} size={12} color={sortBy === s.key ? theme.textInverse : theme.textTertiary} />
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: sortBy === s.key ? theme.textInverse : theme.textTertiary }}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : visible.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            theme={theme}
            icon="user-search"
            title={t("noMastersFound")}
            subtitle={t("noMastersFoundHint")}
            action={t("emptyResetFilters")}
            onAction={() => { setQuery(""); setDevice(""); }}
          />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderRow}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshing={querying}
          onRefresh={load}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

function FilterChip({ active, label, onPress }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingVertical: 7, paddingHorizontal: 14, borderRadius: theme.radius.full,
          backgroundColor: active ? theme.primary : theme.neumorph.surface,
          ...(active ? {} : theme.neumorph.raisedSm),
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={{ fontSize: 11.5, fontWeight: "700", color: active ? theme.textInverse : theme.textTertiary }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export default MasterPickerScreen;
