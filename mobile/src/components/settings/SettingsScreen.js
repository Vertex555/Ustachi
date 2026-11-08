import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeContext";
import Icon from "../Icon";

/**
 * Sozlamalar bo'limlari uchun umumiy qator: orqaga tugmasi + sarlavha.
 * Barcha sub-screen'lar shundan foydalanadi — header bir xil ko'rinadi.
 */
export function SettingsHeader({ title, subtitle, right }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          backgroundColor: theme.bg,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="back"
        style={({ pressed }) => [
          styles.backBtn,
          { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Icon name="chevron-left" size={22} color={theme.text} />
      </Pressable>

      <View style={styles.headerText}>
        <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.text }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: 1 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right || null}
    </View>
  );
}

/** Bo'sh holat (masalan, manzil yoki to'lov yo'q). */
export function EmptyBlock({ icon = "inbox", title, description, action }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primaryLight }]}>
        <Icon name={icon} size={26} color={theme.primary} />
      </View>
      <Text style={{ fontSize: theme.font.base, fontWeight: "700", color: theme.text, marginTop: 12 }}>
        {title}
      </Text>
      {description ? (
        <Text style={{ fontSize: theme.font.sm, color: theme.textTertiary, textAlign: "center", marginTop: 6 }}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

/** Umumiy egiluvchi konteyner. */
export function SettingsScroll({ children, refreshing, onRefresh }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  empty: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
