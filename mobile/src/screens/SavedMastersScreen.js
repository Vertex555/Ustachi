import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "../components/Icon";
import Badge from "../components/Badge";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import AppButton from "../components/AppButton";
import ScreenHeader from "../components/ScreenHeader";
import { fetchSavedMasters, unsaveMaster } from "../services/savedMasters";
import { apiUrl } from "../config";
import { formatPrice } from "../utils/display";

function resolveMedia(uri) {
  if (!uri) return null;
  if (/^data:/i.test(uri) || /^https?:\/\//i.test(uri)) return uri;
  return apiUrl(uri);
}

export function SavedMastersScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await fetchSavedMasters();
    setMasters(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (active) await load();
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  const confirmRemove = (id) => {
    const target = id;
    Alert.alert(t("remove"), null, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("confirm"),
        style: "destructive",
        onPress: async () => {
          const list = await unsaveMaster(target);
          setMasters(list);
        },
      },
    ]);
  };

  const renderRow = (m) => {
    const subtitle = m.price ? formatPrice(m.price, m.currency) : m.specialty || (Array.isArray(m.devices) ? m.devices.join(", ") : m.devices || "");
    return (
      <Card
        key={m.id}
        padding={14}
        accent={theme.primary}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <Pressable
          onPress={() => navigation.navigate("MasterProfile", { master: m })}
          style={({ pressed }) => [
            { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: theme.primary,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {m.photo ? (
              <Image source={{ uri: resolveMedia(m.photo) }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: "800", color: theme.textInverse }}>
                {(m.name || "M").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.type.sub, { color: theme.text }]} numberOfLines={1}>
              {m.name}
            </Text>
            <Text style={[theme.type.bodySm, { color: theme.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              {!!m.rating && (
                <Badge icon="star" label={String(m.rating)} tone="warning" size="sm" />
              )}
              <Badge icon="wrench" label={t("tapToView")} tone="primary" size="sm" />
            </View>
          </View>
        </Pressable>
        <Pressable
          onPress={() => confirmRemove(m.id)}
          style={({ pressed }) => [
            { padding: 6, flexShrink: 0 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="trash-2" size={18} color={theme.error} />
        </Pressable>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScreenHeader
        icon="bookmark"
        title={t("savedMasters")}
        subtitle={t("savedMastersHintSub")}
        count={masters.length}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              load();
            }}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {loading && masters.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : masters.length === 0 ? (
          <EmptyState
            theme={theme}
            icon="bookmark"
            title={t("noSavedMasters")}
            subtitle={t("noSavedMastersHint")}
          />
        ) : (
          masters.map((m) => renderRow(m))
        )}
      </ScrollView>

      {masters.length > 0 && (
        <View style={{ padding: 16, paddingTop: 4 }}>
          <AppButton
            label={t("chooseMaster")}
            onPress={() => navigation.navigate("MasterPicker")}
            icon="search"
            size="md"
          />
        </View>
      )}
    </View>
  );
}

export default SavedMastersScreen;