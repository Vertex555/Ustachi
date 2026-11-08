import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import * as Location from "expo-location";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import { apiUrl, absoluteUrl } from "../config";
import { authHeaders } from "../services/api";
import { formatWorkingHours, displayPhone, formatPrice } from "../utils/display";

export default function MasterProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const master = route.params?.master || null;
  const masterIdFromParams = route.params?.masterId || null;
  const [profile, setProfile] = useState(master || null);

  const load = useCallback(async () => {
    const id = master?.id || master?._id || masterIdFromParams;
    if (!id) return;
    try {
      const res = await fetch(apiUrl(`/api/masters/${id}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && data.data) setProfile(data.data);
    } catch {}
  }, [master?.id, master?._id, masterIdFromParams]);

  useEffect(() => {
    load();
  }, [load]);

  const d = profile || {};
  const name = d.name || t("master");

  const row = (label, value, money) =>
    value ? (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Text style={{ fontSize: 13, color: theme.textSecondary }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 12, flexShrink: 1 }}>
          {money && <Icon name="banknote" size={15} color={theme.success} />}
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text, textAlign: "right" }} numberOfLines={2}>
            {value}
          </Text>
        </View>
      </View>
    ) : null;

  const handleOrder = async () => {
    let userLocation = { lat: 41.311081, lng: 69.240562 };
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const position = await Location.getCurrentPositionAsync({});
        userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      }
    } catch {}
    navigation.navigate("PreOrder", { master: d, userLocation, details: {} });
  };

  const handleChat = async () => {
    const id = d.id || d._id;
    if (!id) return;
    try {
      const res = await fetch(apiUrl(`/api/chat/open/master/${id}`), {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success && data.data && data.data.id) {
        navigation.navigate("ChatWindow", { chatId: data.data.id, peerName: d.name || "Usta" });
      }
    } catch {}
  };

  const photoUri = d.photo
    ? d.photo.startsWith("data:") || d.photo.startsWith("http")
      ? d.photo
      : absoluteUrl(d.photo)
    : "";

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
                ...theme.shadowSm,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon name="chevron-left" size={18} color={theme.text} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "800", color: theme.text }}>{t("masterProfile")}</Text>
        </View>

        <View
          style={{
            backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm,
            padding: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            ...theme.shadowSm,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: theme.primary,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={{ fontSize: 30, fontWeight: "800", color: theme.textInverse }}>
                {(name || "M").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.text, marginBottom: 4 }} numberOfLines={2}>
              {name}
            </Text>
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name="phone" size={14} color={theme.textSecondary} />
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>{displayPhone(d.phone, t("guestPhone"))}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name="star" size={14} color={theme.warning} />
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                  {d.rating ?? 0}
                  {d.reviewsCount ? ` (${d.reviewsCount})` : ""}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm,
            padding: 16,
            marginTop: 16,
            ...theme.shadowSm,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "800", color: theme.text, marginBottom: 8 }}>{t("anketaData")}</Text>
          {row(t("masterExperience"), d.experience ? `${d.experience}+ ${t("masterYears")}` : null)}
          {row(t("masterDevices"), (d.devices || []).length ? d.devices.join(", ") : null)}
          {row(t("masterPrice"), d.price ? formatPrice(d.price, d.currency) : null, true)}
          {row(t("masterHours"), d.workingHours ? formatWorkingHours(d.workingHours) : null)}
          {row(t("masterLocationLabel"), typeof d.location === "string" ? d.location : d.location?.address)}
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          <Pressable
            onPress={handleChat}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: theme.bgSecondary,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon name="message-circle" size={18} color={theme.text} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>{t("chat")}</Text>
          </Pressable>
          <Pressable
            onPress={handleOrder}
            style={({ pressed }) => [
              {
                flex: 2,
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon name="shopping-cart" size={18} color={theme.textInverse} />
            <Text style={{ fontSize: 14, fontWeight: "800", color: theme.textInverse }}>{t("orderNow")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}