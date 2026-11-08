import React from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "./Icon";

export function buildYandexUrl(from, to) {
  if (from && to && from.lat && to.lat) {
    return `https://yandex.com/maps/?rtext=${from.lat},${from.lng}~${to.lat},${to.lng}&rtt=auto`;
  }
  const pt = to || from;
  if (!pt || !pt.lat) return "https://yandex.com/maps";
  return `https://yandex.com/maps/?ll=${pt.lng},${pt.lat}&z=15&pt=${pt.lng},${pt.lat}`;
}

export function openYandexMaps(from, to) {
  const url = buildYandexUrl(from, to);
  Linking.openURL(url).catch(() => {});
}

export function MapCard({
  center,
  markers = [],
  from,
  to,
  height = 200,
  showLegend = false,
  children,
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const hasRoute = !!(from && to && from.lat && to.lat && from.lng && to.lng);

  return (
    <Pressable
      onPress={() => openYandexMaps(from, to)}
      style={({ pressed }) => [
        {
          height,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.bgTertiary,
          overflow: "hidden",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={{ alignItems: "center", gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {markers.some((m) => m.color === "rd") && (
            <View style={{ alignItems: "center", gap: 2 }}>
              <Icon name="map-pin" size={26} color={theme.error} />
              <Text style={{ color: theme.textSecondary, fontSize: 10, fontWeight: "700" }}>{t("yourLocation")}</Text>
            </View>
          )}
          {markers.some((m) => m.color === "gn") && (
            <View style={{ alignItems: "center", gap: 2 }}>
              <Icon name="map-pin" size={26} color={theme.success} />
              <Text style={{ color: theme.textSecondary, fontSize: 10, fontWeight: "700" }}>{t("masterLocation")}</Text>
            </View>
          )}
          {center && center.lat && !markers.length && (
            <Icon name="map-pin" size={26} color={theme.primary} />
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.surface, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border }}>
          <Icon name="navigation" size={14} color={theme.primary} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: theme.text }}>
            {hasRoute ? t("mapOpenRoute", "Yo'nalish") : t("mapOpen", "Yandex Map'da ochish")}
          </Text>
        </View>
        {showLegend && (
          <View style={{ flexDirection: "row", gap: 16 }}>
            {markers.some((m) => m.color === "rd") && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={[styles.dot, { backgroundColor: theme.error }]} />
                <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: "700" }}>{t("yourLocation")}</Text>
              </View>
            )}
            {markers.some((m) => m.color === "gn") && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={[styles.dot, { backgroundColor: theme.success }]} />
                <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: "700" }}>{t("masterLocation")}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5 },
});

export default MapCard;